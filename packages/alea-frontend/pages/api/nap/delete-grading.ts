import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeTxnAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';

function sqlInPlaceholders(n: number): string {
  return Array(Math.max(n, 1)).fill('?').join(',');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const { id } = req.body;
  const gradingRows = await executeAndEndSet500OnError<{ id: number }[]>(
    `SELECT g.id
     FROM Grading g
     INNER JOIN Grading selected ON selected.answerId = g.answerId
     WHERE selected.checkerId=? AND selected.id=? AND g.checkerId=?`,
    [userId, id, userId],
    res
  );
  if (!gradingRows) return;
  if (!gradingRows.length) return res.status(404).end();

  const gradingIds = gradingRows.map((g) => g.id);
  const placeholders = sqlInPlaceholders(gradingIds.length);
  const deleted = await executeTxnAndEndSet500OnError(
    res,
    `DELETE FROM GradingAnswerClass WHERE gradingId IN (${placeholders})`,
    gradingIds,
    `DELETE FROM Grading WHERE id IN (${placeholders}) AND checkerId=?`,
    [...gradingIds, userId]
  );
  if (!deleted) return;
  res.status(200).end();
}
