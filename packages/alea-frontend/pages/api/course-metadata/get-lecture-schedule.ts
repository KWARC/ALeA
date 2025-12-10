import { toWeekdayIndex } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { courseId, instanceId } = req.query as { courseId?: string; instanceId?: string };

  if (!courseId || !instanceId) {
    res.status(422).end('Missing required fields');
    return;
  }

  const result = await executeAndEndSet500OnError(
    `SELECT lectureSchedule FROM courseMetadata WHERE courseId = ? AND instanceId = ?`,
    [courseId, instanceId],
    res
  );
  if (!result) return;

  let lectureSchedule: any[] = [];
  try {
    lectureSchedule =
      Array.isArray(result) && result.length ? JSON.parse(result[0].lectureSchedule || '[]') : [];
  } catch (e) {
    lectureSchedule = [];
  }
  const schedule = lectureSchedule?.map((lec: any) => ({
    dayOfWeek: toWeekdayIndex(lec.lectureDay) ?? undefined,
    startTime: lec.lectureStartTime,
    endTime: lec.lectureEndTime,
    venue: lec.venue,
    venueLink: lec.venueLink,
  }));

  res.status(200).json({ schedule });
}
