import { CreateGradingRequest, ReviewType } from '@alea/spec';
import { Action, ResourceName } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { isUserIdAuthorizedForAny } from '../access-control/resource-utils';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeTxnAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const graderUserId = await getUserIdOrSetError(req, res);
  if (!graderUserId) return;
  const { answerId } = req.body as CreateGradingRequest;
  let { customFeedback, answerClasses } = req.body as CreateGradingRequest;
  answerClasses = answerClasses?.filter((c) => c.count !== 0);
  customFeedback = customFeedback?.trim();
  if (!answerId || !answerClasses?.length) return res.status(422).end();

  for (const answerClassItem of answerClasses) {
    if (
      !answerClassItem.answerClassId ||
      answerClassItem.closed === null ||
      answerClassItem.isTrait === null ||
      !answerClassItem.description ||
      !answerClassItem.title ||
      !answerClassItem.points === null
    )
      return res.status(422).end();
  }

  const answerRows = await executeAndEndSet500OnError(
    `SELECT userId, courseId, courseInstance FROM Answer WHERE id=?`,
    [answerId],
    res
  );
  if (!answerRows) return;
  if (!answerRows.length) return res.status(404).send('Answer not found');
  const answerRow = answerRows[0];
  const isInstructorGrader = await isUserIdAuthorizedForAny(graderUserId, [
    {
      name: ResourceName.COURSE_HOMEWORK,
      action: Action.INSTRUCTOR_GRADING,
      variables: { courseId: answerRow.courseId, instanceId: answerRow.courseInstance },
    },
  ]);
  const reviewType =
    graderUserId === answerRow.userId
      ? ReviewType.SELF
      : isInstructorGrader
      ? ReviewType.INSTRUCTOR
      : ReviewType.PEER;

  let totalPoints = 0;
  for (const answerClass of answerClasses) {
    totalPoints += answerClass.count * answerClass.points;
  }
  const gradingAnswerClassInsertParams = answerClasses.flatMap((c) => [
    c.answerClassId,
    c.points,
    c.isTrait,
    c.closed,
    c.title,
    c.description,
    c.count,
  ]);
  const gradingAnswerClassRowPlaceholders = new Array(answerClasses.length).fill(
    '(LAST_INSERT_ID(), ?, ?, ?, ?, ?, ?, ?)'
  );
  const transactionResult = await executeTxnAndEndSet500OnError(
    res,
    `INSERT INTO Grading (checkerId, answerId, reviewType, customFeedback, totalPoints) 
    VALUES (?,?,?,?,?)`,
    [graderUserId, answerId, reviewType, customFeedback, totalPoints],
    'SELECT LAST_INSERT_ID() AS insertId',
    [],
    `INSERT INTO GradingAnswerClass (gradingId, answerClassId, points, isTrait, closed, title, description, count)
    VALUES ${gradingAnswerClassRowPlaceholders.join(', ')}`,
    gradingAnswerClassInsertParams
  );
  if (!transactionResult) return;
  res.status(201).end();
}
