import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { courseId, instanceId, lectureEntry } = req.body;

  if (!courseId || !instanceId || !lectureEntry) {
    return res.status(422).send('Missing required fields');
  }

  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const result = await executeAndEndSet500OnError(
    `SELECT lectureSchedule
     FROM courseMetaData
     WHERE courseId = ? AND instanceId = ?`,
    [courseId, instanceId],
    res
  );

  if (!result?.length || !result[0].lectureSchedule) {
    return res.status(404).end('No lecture schedule found for the specified course and instance');
  }

  let lectureSchedule: any[];
  try {
    lectureSchedule = JSON.parse(result[0].lectureSchedule);
  } catch {
    return res.status(500).end('Failed to parse lecture schedule JSON');
  }

  const filtered = lectureSchedule.filter((entry) => {
    return !(
      entry.lectureDay === lectureEntry.lectureDay &&
      entry.lectureStartTime === lectureEntry.lectureStartTime &&
      entry.lectureEndTime === lectureEntry.lectureEndTime &&
      entry.venue === lectureEntry.venue &&
      entry.venueLink === lectureEntry.venueLink &&
      entry.hasQuiz === lectureEntry.hasQuiz &&
      entry.hasHomework === lectureEntry.hasHomework
    );
  });

  const updateResult = await executeAndEndSet500OnError(
    `UPDATE courseMetaData
     SET lectureSchedule = ?, updatedAt = CURRENT_TIMESTAMP
     WHERE courseId = ? AND instanceId = ?`,
    [JSON.stringify(filtered), courseId, instanceId],
    res
  );
  if (!updateResult) return;

  res.status(200).end('Lecture entry deleted successfully');
}
