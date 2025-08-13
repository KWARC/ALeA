import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { courseId } = req.query;

  if (!courseId) {
    res.status(422).json({ error: 'Missing courseId' });
    return;
  }

  const announcements = await executeAndEndSet500OnError(
    `SELECT courseId, instructorId, title, content, createdAt, updatedAt, visibleUntil
     FROM announcement
     WHERE courseId = ?
     ORDER BY createdAt DESC`,
    [courseId],
    res
  );
  if (!announcements) return;

  res.status(200).json(announcements);
}
