import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { courseId, instanceId } = req.query;
  if (!courseId || !instanceId) {
    return res.status(422).end('Missing required fields');
  }

  const result = await executeAndEndSet500OnError(
    `SELECT * FROM courseMetadata WHERE courseId = ? AND instanceId = ?`,
    [courseId, instanceId],
    res
  );

  if (!result || result.length === 0) {
    return res.status(404).end('Course metadata not found');
  }

  const data = result[0];
  try {
    data.instructors = JSON.parse(data.instructors || '[]');
    data.lectureSchedule = JSON.parse(data.lectureSchedule || '[]');
    data.tutorialSchedule = JSON.parse(data.tutorialSchedule || '[]');
  } catch (e) {
    console.error('Failed to parse JSON fields:', e);
  }

  res.status(200).json(data);
}
