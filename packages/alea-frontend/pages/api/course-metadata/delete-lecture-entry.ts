import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { ResourceName, Action } from '@stex-react/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { courseId, instanceId, lectureEntry } = req.body;

  if (!courseId || !instanceId || !lectureEntry || !lectureEntry.lectureDay) {
    res.status(422).send('Missing required fields');
    return;
  }

  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  // Step 1: Fetch existing lectureSchedule JSON array
  const result = await executeAndEndSet500OnError(
    `SELECT lectureSchedule FROM coursemetadata WHERE userId = ? AND courseId = ? AND instanceId = ?`,
    [userId, courseId, instanceId],
    res
  );

  if (!result?.length || !result[0].lectureSchedule) {
    return res.status(404).end('No lecture schedule found for the specified course and instance');
  }

  let lectureSchedule: any[];
  try {
    lectureSchedule = JSON.parse(result.lectureSchedule);
  } catch {
    return res.status(500).end('Failed to parse lecture schedule JSON');
  }

  // Step 2: Filter out the lecture entry to delete
  // Adjust matching logic as necessary; here based on matching lectureDay
  const filtered = lectureSchedule.filter((entry) => entry.lectureDay !== lectureEntry.lectureDay);

  // Step 3: Update the DB with filtered lecture schedule JSON
  const updateResult = await executeAndEndSet500OnError(
    `UPDATE coursemetadata SET lectureSchedule = ?, userId = ?, updatedAt = CURRENT_TIMESTAMP WHERE courseId = ? AND instanceId = ?`,
    [JSON.stringify(filtered), userId, courseId, instanceId],
    res
  );
  if (!updateResult) return;

  res.status(200).end('Lecture entry deleted successfully');
}
