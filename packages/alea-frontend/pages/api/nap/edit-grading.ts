import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { UpdateGradingRequest } from '@alea/spec';
import { isValidGradingAnswerClassItem } from './validate-grading-answer-class';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  //TODO:Need ACL. only grader owner can change it.
  if (!userId) return;
  const { id } = req.body as UpdateGradingRequest;
  let { customFeedback, answerClasses } = req.body as UpdateGradingRequest;
  answerClasses = answerClasses.filter((c) => (c?.count ?? 0) > 0);
  customFeedback = customFeedback?.trim();
  if (!id || answerClasses.length == 0) {
    return res.status(422).end();
  }
  for (const element of answerClasses) {
    if (!isValidGradingAnswerClassItem(element)) {
      return res.status(422).end();
    }
  }

  const values = new Array(answerClasses.length).fill('(?, ?, ?,?,?,?,?,?)');
  let totalPoints = 0;
  for (const answerClass of answerClasses) {
    totalPoints += answerClass.count * answerClass.points;
  }
  await executeAndEndSet500OnError(
    `Update Grading Set totalPoints=?, customFeedback=? where id=? and checkerId=?`,
    [totalPoints, customFeedback, id, userId],
    res
  );
  await executeAndEndSet500OnError(`Delete From GradingAnswerClass Where gradingId=?`, [id], res);

  const answerClassesParams = answerClasses.flatMap((c) => [
    id,
    c.answerClassId,
    c.points,
    c.isTrait,
    c.closed,
    c.title,
    c.description,
    c.count,
  ]);
  await executeAndEndSet500OnError(
    `INSERT INTO GradingAnswerClass (gradingId,answerClassId,points,isTrait,closed,title,description,count) values ${values.join(
      ', '
    )}`,
    answerClassesParams,
    res
  );
  res.status(200).end();
}
