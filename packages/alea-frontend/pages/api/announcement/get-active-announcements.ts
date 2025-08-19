import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { courseId, instanceId  } = req.query;

  if (!courseId || !instanceId) {
    res.status(422).end('Missing courseId or instanceId');
    return;
  }

  const announcements = await executeAndEndSet500OnError(
    `SELECT courseId, instructorId, instanceId, title, content, createdAt, updatedAt, visibleUntil
     FROM announcement
     WHERE courseId = ? AND instanceId = ? AND (visibleUntil IS NULL OR visibleUntil > NOW())
     ORDER BY createdAt DESC`,
    [courseId, instanceId],
    res
  );
  if (!announcements) return;

  res.status(200).json(announcements);
}
