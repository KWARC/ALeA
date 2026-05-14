import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  checkIfQueryParameterExistOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { getAllGradingsOrSetError } from './get-answers-info';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  if (!checkIfQueryParameterExistOrSetError(req, res, 'answerId')) return;
  const answerId = +req.query.answerId;
  if (!checkIfQueryParameterExistOrSetError(req, res, 'subProblemId')) return;

  const rows = await executeAndEndSet500OnError<{ id: number; subProblemId: string }[]>(
    'SELECT id, subProblemId FROM Answer WHERE userId=? AND id=? AND (homeworkId IS NULL OR homeworkId = 0)',
    [userId, answerId],
    res
  );
  if (!rows) return;
  if (!rows.length) return res.status(404).end();

  // Use the DB value; the query string can differ by encoding/slash normalization.
  const subProblemId = String(rows[0].subProblemId ?? req.query.subProblemId ?? '').trim();
  const gradings = await getAllGradingsOrSetError({ [subProblemId]: answerId }, res);
  if (!gradings) return;
  const payload = gradings[subProblemId];
  return res.json(Array.isArray(payload) ? payload : []);
}
