import { Action, LectureEntry } from '@alea/utils';
import ical, { ICalEventData } from 'ical-generator';
import { NextApiRequest, NextApiResponse } from 'next';
import { getCoverageData } from '../get-coverage-timeline';
import { getAuthorizedCourseResources } from '../get-resources-for-user';
import { executeQuery } from '../comment-utils';
import { getAllCoursesFromDb } from '../get-all-courses';
import { getCurrentTermForCourseId } from '../get-current-term';
interface SemesterInfo {
  semesterStart: string;
  semesterEnd: string;
  lectureStartDate: string;
  lectureEndDate: string;
  holidays: string;
}

function parseDateDDMMYYYY(dateStr: string): Date {
  const [dayStr, monthStr, yearStr] = (dateStr || '').split('/');
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);
  return new Date(year, month - 1, day);
}


async function getSemesterInfoFromDb(
  universityId: string,
  instanceId: string
): Promise<SemesterInfo | null> {
  try {
    const result = await executeQuery<SemesterInfo[]>(
      `SELECT semesterStart, semesterEnd, lectureStartDate, lectureEndDate, holidays
       FROM semesterInfo
       WHERE universityId = ? AND instanceId = ?`,
      [universityId, instanceId]
    );
    if ('error' in result) {
      console.error('Database error fetching semester info:', result.error);
      return null;
    }
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error fetching semester info from database:', error);
    return null;
  }
}

function generateCalendarEvents(
  coverageData: Record<string, LectureEntry[]>,
  accessibleCourseIds: Set<string>
): ICalEventData[] {
  const events: ICalEventData[] = [];
  for (const [courseId, entries] of Object.entries(coverageData)) {
    if (!accessibleCourseIds.has(courseId)) {
      continue;
    }

    for (const entry of entries) {
      const lectureInfo = entry.isQuizScheduled ? '📝 Lecture and Quiz' : '📚 Lecture';
      const location = entry.venue || undefined;
      let summary = `${courseId} - ${lectureInfo}`;
      let description = `Course: ${courseId}\n${lectureInfo}`;
      if (location) description += `\nLocation: ${location}`;
      if (entry.lectureEndTimestamp_ms) {
        events.push({
          start: new Date(entry.timestamp_ms),
          end: new Date(entry.lectureEndTimestamp_ms),
          summary,
          description,
          location,
        });
      } else {
        const start = new Date(entry.timestamp_ms);
        start.setHours(0, 0, 0, 0);
        events.push({
          start,
          allDay: true,
          summary,
          description,
          location,
        });
      }
    }
  }
  return events;
}

async function generateSemesterAndHolidayEvents(
  universityId: string,
  instanceId: string
): Promise<ICalEventData[]> {
  const events: ICalEventData[] = [];
  const semesterInfo = await getSemesterInfoFromDb(universityId, instanceId);
  if (!semesterInfo) {
    console.log(
      'No semester info found in database for universityId:',
      universityId,
      'instanceId:',
      instanceId
    );
    return events;
  }
  events.push({
    start: new Date(semesterInfo.semesterStart),
    allDay: true,
    summary: `Semester Start : ${instanceId}`,
    description: `Start of ${instanceId}`,
  });
  events.push({
    start: new Date(semesterInfo.semesterEnd),
    allDay: true,
    summary: `Semester End : ${instanceId}`,
    description: `End of ${instanceId}`,
  });
  events.push({
    start: new Date(semesterInfo.lectureStartDate),
    allDay: true,
    summary: `Lecture Period Start for Semester : ${instanceId}`,
    description: `Start of lectures for ${instanceId}`,
  });
  events.push({
    start: new Date(semesterInfo.lectureEndDate),
    allDay: true,
    summary: `Lecture Period End for Semester : ${instanceId}`,
    description: `End of lectures for ${instanceId}`,
  });

  try {
    const parsed = JSON.parse(semesterInfo.holidays || '{}');
    const holidaysArray: { date: string; name: string }[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as any)?.holidays)
      ? (parsed as any).holidays
      : [];

    holidaysArray.forEach((holiday) => {
      const date = parseDateDDMMYYYY(holiday.date);
      if (isNaN(date.getTime())) return;
      events.push({
        start: date,
        allDay: true,
        summary: `Holiday: ${holiday.name}`,
        description: `${holiday.name}`,
      });
    });
  } catch (error) {
    console.error('Error parsing holidays from database:', error);
  }
  return events;
}

async function getUserEvents(
  userId: string
): Promise<{ events: ICalEventData[]; universityId?: string; instanceId?: string }> {
  const coverageData = getCoverageData();

  const coverageLecturesByCourseId: Record<string, LectureEntry[]> = Object.fromEntries(
  Object.entries(coverageData).map(([courseId, courseData]) => [
    courseId,
    Array.isArray(courseData)
      ? courseData
      : courseData?.lectures ?? [],
  ])
);

  const resourceAndActions = await getAuthorizedCourseResources(userId);

  const resourceAccessToInstructor = resourceAndActions
    .map((item) => ({
      ...item,
      actions: item.actions.filter((action) => action !== Action.TAKE),
    }))
    .filter((resource) => resource.actions.length > 0);
  const isInstructor = resourceAccessToInstructor.length > 0;

  const accessibleCourseIdsForInstructor = new Set(
    resourceAccessToInstructor.map((resource) => resource.courseId)
  );

  const accessibleCourseIdsForStudent = new Set(
    resourceAndActions
      .filter((resource: any) => resource.actions.includes(Action.TAKE))
      .map((resource: any) => resource.courseId)
  );

  const accessibleCourseIds = isInstructor
    ? accessibleCourseIdsForInstructor
    : accessibleCourseIdsForStudent;
  const events = generateCalendarEvents(coverageLecturesByCourseId, accessibleCourseIds);


  // Get universityId and instanceId from the first accessible course
  let universityId: string | undefined;
  let instanceId: string | undefined;

  if (accessibleCourseIds.size > 0) {
    const firstCourseId = Array.from(accessibleCourseIds)[0];
    try {
      const courses = await getAllCoursesFromDb();
      const courseInfo = courses[firstCourseId];
      if (courseInfo?.universityId) {
        universityId = courseInfo.universityId;
        instanceId = await getCurrentTermForCourseId(firstCourseId);
      }
    } catch (error) {
      console.error('Error getting course info for universityId and instanceId:', error);
    }
  }
  return { events, universityId, instanceId };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = req.query.userId as string;
  if (!userId) {
    res.status(400).json({
      error: 'Missing userId. Please provide userId as a query parameter.',
    });
    return;
  }

  const calendar = ical({
    name: `ALeA Calendar for ${userId}`,
    timezone: 'Europe/Berlin',
  });

  const { events, universityId, instanceId } = await getUserEvents(userId);

  const semesterAndHolidayEvents =
    universityId && instanceId
      ? await generateSemesterAndHolidayEvents(universityId, instanceId)
      : [];

  [...events, ...semesterAndHolidayEvents].forEach((event) => {
    calendar.createEvent(event);
  });

  res.status(200).send(calendar.toString());
}
