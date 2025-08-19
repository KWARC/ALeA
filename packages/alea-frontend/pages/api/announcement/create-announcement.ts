import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { ResourceName, Action, CURRENT_TERM } from '@stex-react/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { courseId, title, content, visibleUntil } = req.body;
  const instanceId = CURRENT_TERM;

  if (!courseId || !title || !content || !visibleUntil || !instanceId) {
    res.status(422).send('Missing required fields');
    return;
  }

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_ACCESS,
    Action.ACCESS_CONTROL,
    { courseId, instanceId }
  );
  if (!userId) return;

  const result = await executeAndEndSet500OnError(
    `INSERT INTO announcement (courseId, instructorId, title, content, visibleUntil,instanceId)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [courseId, userId, title, content, visibleUntil, instanceId],
    res
  );
  if (!result) return;

  res.status(201).end();
}
