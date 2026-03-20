import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import {
  getUserIdIfAuthorizedOrSetError,
  isUserIdAuthorizedForAny,
  ResourceActionParams,
} from '../access-control/resource-utils';
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

async function safeIsAuthorized(
  userId: string,
  resourceActions: ResourceActionParams[]
): Promise<boolean> {
  try {
    return await isUserIdAuthorizedForAny(userId, resourceActions);
  } catch (err) {
    return false;
  }
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const { courseId, instanceId, userId: requestedUserId } = req.query;
  if (!courseId || !instanceId) {
    return res.status(422).send('Missing courseId or instanceId');
  }
  if (typeof courseId !== 'string' || typeof instanceId !== 'string') {
    return res.status(422).send('Invalid params');
  }

  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const isInstructor = await safeIsAuthorized(userId, [
    {
      name: ResourceName.COURSE_CHEATSHEET,
      action: Action.MUTATE,
      variables: { courseId, instanceId },
    },
  ]);

  const isStudent = await safeIsAuthorized(userId, [
    {
      name: ResourceName.COURSE_CHEATSHEET,
      action: Action.UPLOAD,
      variables: { courseId, instanceId },
    },
  ]);

  if (!isInstructor && !isStudent) {
    return res.status(403).end();
  }

  let query = `
    SELECT cheatsheetId, userId, universityId, courseId, instanceId, weekId, checksum, createdAt, uploadedAt
    FROM CheatSheet
    WHERE courseId = ? 
      AND instanceId = ? 
      AND uploadedAt IS NOT NULL
  `;

  const values: any[] = [courseId, instanceId];
  if (typeof requestedUserId === 'string') {
    if (!isInstructor) return res.status(403).end();
    query += ` AND userId = ?`;
    values.push(requestedUserId);
  } else {
    if (!isInstructor) {
      query += ` AND userId = ?`;
      values.push(userId);
    }
  }
  query += ` ORDER BY createdAt DESC`;

  const results = await executeAndEndSet500OnError(query, values, res);
  if (!results) return;

  return res.status(200).send(results);
}
