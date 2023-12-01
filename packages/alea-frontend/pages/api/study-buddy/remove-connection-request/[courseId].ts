import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../../comment-utils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const courseId = req.query.courseId as string;
  const receiverId = req.body?.receiverId;

  if (!receiverId) {
    res.status(400).json({ message: `receiverId not found` });
    return;
  }

  const results = await executeAndEndSet500OnError(
    'DELETE FROM StudyBuddyConnections WHERE senderId=? AND receiverId=? AND courseId=?',
    [userId, receiverId, courseId],
    res
  );

  if (!results) return;
  res.status(204).end();
}
