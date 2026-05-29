import { GradingAnswerClass, GradingInfo } from '@alea/spec';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  checkIfQueryParameterExistOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  if (!checkIfQueryParameterExistOrSetError(req, res, 'answerId')) return;
  const answerId = +req.query.answerId;

  const rows = await executeAndEndSet500OnError<GradingInfo[]>(
    `SELECT id, checkerId, reviewType, answerId, customFeedback, totalPoints, createdAt, updatedAt
     FROM Grading
     WHERE answerId = ? AND checkerId = ?
     ORDER BY updatedAt DESC, id DESC
     LIMIT 1`,
    [answerId, userId],
    res
  );
  if (!rows) return;
  if (!rows.length) return res.status(404).end();

  const g = rows[0];
  const acRows = await executeAndEndSet500OnError<GradingAnswerClass[]>(
    `SELECT id, answerClassId, gradingId, points, isTrait, closed, title, description, count
     FROM GradingAnswerClass WHERE gradingId = ?`,
    [g.id],
    res
  );
  if (!acRows) return;
  const payload: GradingInfo = {
    ...g,
    answerClasses: acRows,
  };
  return res.json(payload);
}
