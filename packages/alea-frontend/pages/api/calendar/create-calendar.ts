import { Action, LectureEntry, semesterPeriods } from '@stex-react/utils';
import ical, { ICalEventData } from 'ical-generator';
import { NextApiRequest, NextApiResponse } from 'next';
import { getCoverageData } from '../get-coverage-timeline';
import { getAuthorizedCourseResources } from '../get-resources-for-user';

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
      const lectureInfo = entry.isQuizScheduled
        ? '📝 Lecture and Quiz'
        : '📚 Lecture';
      if (entry.lectureEndTimestamp_ms) {
        events.push({
          start: new Date(entry.timestamp_ms),
          end: new Date(entry.lectureEndTimestamp_ms),
          summary: `${courseId} - ${lectureInfo}`,
          description: `Course: ${courseId}\n${lectureInfo}`,
        });
      } else {
        const start = new Date(entry.timestamp_ms);
        start.setHours(0, 0, 0, 0);
        events.push({
          start,
          allDay: true,
          summary: `${courseId} - ${lectureInfo}`,
          description: `Course: ${courseId}\n${lectureInfo}`,
        });
      }
    }
  }
  return events;
}

function generateSemesterAndHolidayEvents(): ICalEventData[] {
  const events: ICalEventData[] = [];

  Object.entries(semesterPeriods).forEach(([name, period]) => {
    events.push({
      start: new Date(period.semesterStart),
      allDay: true,
      summary: `Semester Start : ${name}`,
      description: `Start of ${name}`,
    });
    events.push({
      start: new Date(period.semesterEnd),
      allDay: true,
      summary: `Semester End : ${name}`,
      description: `End of ${name}`,
    });
    events.push({
      start: new Date(period.lectureStart),
      allDay: true,
      summary: `Lecture Period Start for Semester : ${name}`,
      description: `Start of lectures for ${name}`,
    });
    events.push({
      start: new Date(period.lectureEnd),
      allDay: true,
      summary: `Lecture Period End for Semester : ${name}`,
      description: `End of lectures for ${name}`,
    });
    period.holidays.forEach((holiday) => {
      events.push({
        start: new Date(holiday.date),
        allDay: true,
        summary: `Holiday: ${holiday.name}`,
        description: `${holiday.name}`,
      });
    });
    period.examDates.forEach((exam) => {
      if (exam.examStartTime && exam.examEndTime) {
        const startDateTime = new Date(`${exam.examDate}T${exam.examStartTime}`);
        const endDateTime = new Date(`${exam.examDate}T${exam.examEndTime}`);
        events.push({
          start: startDateTime,
          end: endDateTime,
          summary: `Exam: ${exam.courseId}`,
          description: `Exam for ${exam.courseId} in ${name}`,
        });
      } else {
        events.push({
          start: new Date(exam.examDate),
          allDay: true,
          summary: `Exam: ${exam.courseId}`,
          description: `Exam for ${exam.courseId} in ${name}`,
        });
      }
    });
  });

  return events;
}

async function getUserEvents(userId: string): Promise<ICalEventData[]> {
  const coverageData = getCoverageData();
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

  return isInstructor
    ? generateCalendarEvents(coverageData, accessibleCourseIdsForInstructor)
    : generateCalendarEvents(coverageData, accessibleCourseIdsForStudent);
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

  const events = await getUserEvents(userId);
  const semesterAndHolidayEvents = generateSemesterAndHolidayEvents();
  [...events, ...semesterAndHolidayEvents].forEach((event) => {
    calendar.createEvent(event);
  });

  res.status(200).send(calendar.toString());
}
