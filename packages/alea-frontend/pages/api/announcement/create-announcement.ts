import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { ResourceName, Action } from '@alea/utils';
import { CreateAnnouncementRequest } from '@alea/spec';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { courseId, title, content, visibleUntil, instanceId, institutionId } =
    req.body as CreateAnnouncementRequest & { institutionId?: string };

  if (!courseId || !title || !content || !visibleUntil || !instanceId || !institutionId) {
    res.status(422).send('Missing required fields');
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
    `INSERT INTO announcement (courseId, instructorId, title, content, visibleUntil, instanceId, institutionId)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [courseId, userId, title, content, visibleUntil, instanceId, institutionId],
    res
  );
  if (!result) return;

  res.status(201).end();
}
