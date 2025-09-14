import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { UpdateGradingRequest } from '@alea/spec';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  //TODO:Need ACL. only grader owner can change it.
  if (!userId) return;
  const { id } = req.body as UpdateGradingRequest;
  let { customFeedback, answerClasses } = req.body as UpdateGradingRequest;
  answerClasses = answerClasses.filter((c) => c.count != 0);
  customFeedback = customFeedback?.trim();
  if (!id || answerClasses.length == 0) {
    res.status(422).end();
  }
  answerClasses.forEach((element) => {
    if (
      !element.answerClassId ||
      element.closed == null ||
      element.isTrait == null ||
      !element.description ||
      !element.title ||
      !element.points
    )
      res.status(422).end();
    return;
  });

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
