import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { universityId, instanceId } = req.query;

  let query: string;
  let params: any[];

  if (instanceId) {
    query = `SELECT DISTINCT courseId FROM courseMetadata WHERE universityId = ? AND instanceId = ? ORDER BY courseId`;
    params = [universityId, instanceId];
  } else {
    query = `SELECT DISTINCT courseId FROM courseMetadata WHERE universityId = ? ORDER BY courseId`;
    params = [universityId];
  }

  const result = await executeAndEndSet500OnError<{ courseId: string }[]>(query, params, res);

  if (!result) return;

  const courseIds = result.map((row) => row.courseId);
  res.status(200).json({ courseIds });
}

