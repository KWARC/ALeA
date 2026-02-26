import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, ResourceName } from '@alea/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const { courseId, instanceId } = req.query;
  let { userId: targetUserId } = req.query;
  if (!courseId || !instanceId) return res.status(422).send('Missing courseId or instanceId');
  if (typeof courseId !== 'string' || typeof instanceId !== 'string') {
    return res.status(422).send('Invalid params');
  }

  let authUserId: string | void;

  if (typeof targetUserId === 'string') {
    authUserId = await getUserIdIfAuthorizedOrSetError(
      req,
      res,
      ResourceName.COURSE_CHEATSHEET,
      Action.MUTATE,
      { courseId, instanceId }
    );
    if (!authUserId) return;
  } else {
    authUserId = await getUserIdIfAuthorizedOrSetError(
      req,
      res,
      ResourceName.COURSE_CHEATSHEET,
      Action.UPLOAD,
      { courseId, instanceId }
    );
    if (!authUserId) return;
    targetUserId = authUserId;
  }
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
