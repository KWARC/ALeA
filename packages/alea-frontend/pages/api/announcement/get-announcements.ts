import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@alea/utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { courseId, instanceId, institutionId } = req.query;

  if (!courseId || !instanceId || !institutionId) {
    res.status(422).end('Missing courseId or instanceId');
    return;
  }

  // Staff listing (includes instructorId); students use get-active-announcements.
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_METADATA,
    Action.MUTATE,
    { courseId: courseId as string, instanceId: instanceId as string }
  );
  if (!userId) return;

  const announcements = await executeAndEndSet500OnError(
    `SELECT id, courseId, instructorId, instanceId, institutionId, title, content, createdAt, updatedAt, visibleUntil
     FROM announcement
     WHERE courseId = ? AND instanceId = ? AND institutionId = ?
     ORDER BY createdAt DESC`,
    [courseId, instanceId, institutionId],
    res
  );
  if (!announcements) return;

  res.status(200).json(announcements);
}
