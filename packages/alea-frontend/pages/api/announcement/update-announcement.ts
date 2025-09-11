import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { ResourceName, Action } from '@stex-react/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { id, courseId, title, content, visibleUntil, instanceId } = req.body;

  if (!id || !courseId || !title || !content || !instanceId) {
    res.status(422).end('Missing required fields');
    return;
  }

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_METADATA,
    Action.MUTATE,
    { courseId, instanceId }
  );
  if (!userId) return;

  const result = await executeAndEndSet500OnError(
    `UPDATE announcement
   SET title = ?, content = ?, visibleUntil = ?, updatedAt = NOW()
   WHERE id = ? AND courseId = ? AND instanceId = ?`,
    [title, content, visibleUntil, id, courseId, instanceId],
    res
  );
  if (!result) return;

  res.status(200).end('Announcement updated successfully');
}
