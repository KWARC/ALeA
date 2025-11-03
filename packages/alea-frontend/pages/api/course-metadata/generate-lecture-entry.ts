import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { executeDontEndSet500OnError, executeAndEndSet500OnError } from '../comment-utils';
import { Holiday, LectureSchedule } from '@alea/spec';

export function toWeekdayIndex(weekday: string): number | undefined {
  const map: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  return map[weekday];
}

function parseDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    return new Date(dateInput);
  }

  const dateStr = String(dateInput);
  if (dateStr.includes(' ')) {
    const [datePart] = dateStr.split(' ');
    return new Date(datePart + 'T00:00:00.000Z');
  }
  return new Date(dateStr);
}

function isHoliday(date: Date, holidays: Holiday[]): boolean {
  const dateStr = date.toLocaleDateString('en-GB');
  return holidays.some((holiday) => holiday.date === dateStr);
}

function setTimeOnDate(date: Date, timeHHMM: string): Date {
  const [h, m] = timeHHMM.split(':').map((v) => parseInt(v, 10));
  const d = new Date(date);
  d.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
  return d;
}

function* generateLectureDates(
  lectureStartDate: Date,
  lectureEndDate: Date,
  targetWeekday: number,
  holidays: Holiday[]
): Generator<Date> {
  const current = new Date(lectureStartDate);
  const startWeekday = current.getDay();
  let daysToAdd = (targetWeekday - startWeekday + 7) % 7;

  if (startWeekday === targetWeekday) {
    daysToAdd = 0;
  }

  current.setDate(current.getDate() + daysToAdd);

  while (current <= lectureEndDate) {
    if (!isHoliday(current, holidays)) {
      yield new Date(current);
    }
    current.setDate(current.getDate() + 7); // Next week
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { courseId, instanceId, universityId } = req.body as {
    courseId?: string;
    instanceId?: string;
    universityId?: string;
  };

  if (!courseId || !instanceId) {
    res.status(422).end('Missing required fields');
    return;
  }

  try {
    const lectureResult = await executeAndEndSet500OnError(
      `SELECT lectureSchedule FROM courseMetadata WHERE courseId = ? AND instanceId = ?`,
      [courseId, instanceId],
      res
    );
    if (!lectureResult) return;

    let lectureSchedule: LectureSchedule[] = [];
    if (Array.isArray(lectureResult) && lectureResult.length > 0) {
      try {
        lectureSchedule = JSON.parse(lectureResult[0].lectureSchedule || '[]');
      } catch (e) {
        console.error('Failed to parse lecture schedule:', e);
        lectureSchedule = [];
      }
    }

    const queries = [
      ...(universityId
        ? [
            `SELECT lectureStartDate, lectureEndDate, holidays FROM semesterInfo WHERE universityId = ? AND instanceId = ? LIMIT 1`,
            [universityId, instanceId],
          ]
        : []),
      [
        `SELECT lectureStartDate, lectureEndDate, holidays FROM semesterInfo WHERE instanceId = ? LIMIT 1`,
        [instanceId],
      ],
      [
        `SELECT lectureStartDate, lectureEndDate, holidays FROM semesterInfo ORDER BY createdAt DESC LIMIT 1`,
        [],
      ],
    ];

    let lectureStartDate: Date | undefined;
    let lectureEndDate: Date | undefined;
    let holidays: Holiday[] = [];

    for (const [query, params] of queries) {
      const semInfo = await executeDontEndSet500OnError<any[]>(
        query as string,
        params as any[],
        res
      );
      if (semInfo && Array.isArray(semInfo) && semInfo.length > 0) {
        const row = semInfo[0];
        lectureStartDate = parseDate(row.lectureStartDate);
        lectureEndDate = parseDate(row.lectureEndDate);

        try {
          holidays = JSON.parse(row.holidays || '[]');
        } catch (e) {
          console.error('Failed to parse holidays:', e);
          holidays = [];
        }

        console.log('Found semester info:', {
          lectureStartDate: lectureStartDate.toISOString().split('T')[0],
          lectureEndDate: lectureEndDate.toISOString().split('T')[0],
          holidayCount: holidays.length,
        });
        break;
      }
    }

    if (!lectureStartDate || !lectureEndDate) {
      return res.status(404).json({ error: 'No semester dates found' });
    }

    const generatedEntries: any[] = [];

    for (const lecture of lectureSchedule) {
      const weekdayIdx = toWeekdayIndex(lecture.lectureDay);
      if (weekdayIdx === undefined) {
        console.warn(`Invalid weekday: ${lecture.lectureDay}`);
        continue;
      }


      for (const lectureDate of generateLectureDates(
        lectureStartDate,
        lectureEndDate,
        weekdayIdx,
        holidays
      )) {
        const startTime = setTimeOnDate(lectureDate, lecture.lectureStartTime);
        const endTime = setTimeOnDate(lectureDate, lecture.lectureEndTime);

        console.log(
          `Generated: ${lectureDate.toISOString().split('T')[0]} (${lecture.lectureDay})`
        );

        generatedEntries.push({
          timestamp_ms: startTime.getTime(),
          sectionUri: '',
          targetSectionUri: '',
          clipId: '',
          isQuizScheduled: !!lecture.hasQuiz,
          slideUri: '',
          autoDetected: {
            clipId: '',
            sectionUri: '',
            slideUri: '',
          },
          lectureEndTimestamp_ms: endTime.getTime(),
          venue: lecture.venue || '',
          venueLink: lecture.venueLink || '',
        });
      }
    }

    generatedEntries.sort((a, b) => a.timestamp_ms - b.timestamp_ms);

    const syllabusDir = process.env.RECORDED_SYLLABUS_DIR;
    const filePath = path.join(syllabusDir, 'current-sem.json');

    if (!fs.existsSync(syllabusDir)) {
      fs.mkdirSync(syllabusDir, { recursive: true });
    }

    let existing: Record<string, any[]> = {};
    let alreadyExists = false;
    try {
      if (fs.existsSync(filePath)) {
        existing = JSON.parse(fs.readFileSync(filePath, 'utf8')) || {};
        alreadyExists = !!existing[courseId] && existing[courseId].length > 0;
      }
    } catch (e) {
      console.error('Failed to read existing file:', e);
      existing = {};
    }
    existing[courseId] = generatedEntries;

    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));

    res.status(200).json({
      courseId,
      count: generatedEntries.length,
      filePath,
      alreadyExists,
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
