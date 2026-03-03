import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, ResourceName } from '@alea/utils';

export async function resolveTargetUserIdOrsetError(
  req: NextApiRequest,
  res: NextApiResponse,
  courseId: string,
  instanceId: string,
  targetUserId?: string | string[]
): Promise<string | null> {
  let authUserId: string | void;
  if (typeof targetUserId === 'string') {
    authUserId = await getUserIdIfAuthorizedOrSetError(
      req,
      res,
      ResourceName.COURSE_CHEATSHEET,
      Action.MUTATE,
      { courseId, instanceId }
    );
    if (!authUserId) return null;
    return targetUserId;
  }
  authUserId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_CHEATSHEET,
    Action.UPLOAD,
    { courseId, instanceId }
  );
  if (!authUserId) return null;
  return authUserId;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const { courseId, instanceId } = req.query;
  if (!courseId || !instanceId) return res.status(422).send('Missing courseId or instanceId');
  if (typeof courseId !== 'string' || typeof instanceId !== 'string') {
    return res.status(422).send('Invalid params');
  }

  const targetUserId = await resolveTargetUserIdOrsetError(
    req,
    res,
    courseId,
    instanceId,
    req.query.userId
  );

  if (!targetUserId) return;
  console.log({ targetUserId, courseId, instanceId });
  const results = await executeAndEndSet500OnError(
    `SELECT id, userId, universityId, courseId, instanceId, weekId, checksum, dateOfDownload, createdAt
      FROM CheatSheet
      WHERE courseId = ? AND instanceId = ? AND userId = ?
      ORDER BY createdAt DESC`,
    [courseId, instanceId, targetUserId],
    res
  );
  if (!results) return;

  return res.status(200).send(results);
}
