import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { courseId, instanceId } = req.query;

  if (!courseId || !instanceId) {
    res.status(422).end('Missing required fields');
    return;
  }

  const result = await executeAndEndSet500OnError(
    `SELECT lectureSchedule FROM courseMetaData WHERE courseId = ? AND instanceId = ?`,
    [courseId, instanceId],
    res
  );

  if (!result?.length) {
    return res.status(404).end('No lecture schedule found');
  }

  let lectureSchedule: any[] = [];
  try {
    lectureSchedule = JSON.parse(result[0].lectureSchedule);
  } catch {
    return res.status(500).end('Failed to parse lecture schedule JSON');
  }

  res.status(200).json({ courseId, instanceId, lectureSchedule });
}