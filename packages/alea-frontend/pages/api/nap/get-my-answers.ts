import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const result = await executeAndEndSet500OnError(
    `SELECT id, questionId, subProblemId, answer, questionTitle, courseId, courseInstance, updatedAt
    FROM Answer 
    WHERE userId=?
    ORDER BY updatedAt DESC`,
    [userId],
    res
  );
  if (!result) return;
  return res.json(result);
}
