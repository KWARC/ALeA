import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../../comment-utils';
import { getCurrentTermForCourseId } from '../../get-current-term';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const courseId = req.query.courseId as string;
  const instanceId = req.query.instanceId as string;
  const institutionId = req.query.institutionId as string;

if (!institutionId || !courseId || !instanceId) {
    res.status(422).end('Missing required field: institutionId or courseId or instanceId');
    return;
  }

  const receiverId = req.body?.receiverId;

  if (!receiverId) {
    res.status(400).json({ message: `receiverId not found` });
    return;
  }

  const results = await executeAndEndSet500OnError(
    'DELETE FROM StudyBuddyConnections WHERE senderId=? AND receiverId=? AND courseId=? AND instanceId=? AND institutionId=?',
    [userId, receiverId, courseId, instanceId, institutionId],
    res
  );

  if (!results) return;
  res.status(204).end();
}
