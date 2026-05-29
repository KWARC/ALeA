import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeTxnAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { UpdateGradingRequest } from '@alea/spec';
import {
  buildGradingAnswerClassInsert,
  normalizedValidAnswerClasses,
  totalGradingPoints,
} from './grading-answer-class-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const { id } = req.body as UpdateGradingRequest;
  let { customFeedback, answerClasses } = req.body as UpdateGradingRequest;
  answerClasses = normalizedValidAnswerClasses(answerClasses) ?? [];
  customFeedback = customFeedback?.trim();
  if (!id || answerClasses.length == 0) {
    return res.status(422).end();
  }

  const existingGradingRows = await executeAndEndSet500OnError<{ id: number }[]>(
    'SELECT id FROM Grading WHERE id=? AND checkerId=?',
    [id, userId],
    res
  );
  if (!existingGradingRows) return;
  if (!existingGradingRows.length) return res.status(404).end();

  const answerClassInsert = buildGradingAnswerClassInsert(answerClasses, id);
  const transactionResult = await executeTxnAndEndSet500OnError(
    res,
    `Update Grading Set totalPoints=?, customFeedback=? where id=? and checkerId=?`,
    [totalGradingPoints(answerClasses), customFeedback, id, userId],
    `Delete From GradingAnswerClass Where gradingId=?`,
    [id],
    `INSERT INTO GradingAnswerClass (${answerClassInsert.columns}) values ${answerClassInsert.placeholders}`,
    answerClassInsert.params
  );
  if (!transactionResult) return;
  res.status(200).end();
}
