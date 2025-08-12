import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { ResourceName, Action } from '@stex-react/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE,
    Action.MANAGE_COURSE,
    req.body.courseId
  );
  if (!userId) return;

  const { courseId, title, content, visibleUntil } = req.body;

  if (!courseId || !title || !content) {
    res.status(422).json({ error: 'Missing required fields' });
    return;
  }

  await executeAndEndSet500OnError(
    `INSERT INTO announcement (courseId, instructorId, title, content, visibleUntil, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [courseId, userId, title, content, visibleUntil],
    res
  );
}
