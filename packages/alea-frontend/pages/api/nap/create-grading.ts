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
import {
  buildGradingAnswerClassInsert,
  normalizedValidAnswerClasses,
  totalGradingPoints,
} from './grading-answer-class-utils';

interface AnswerOwnerRow {
  userId: string;
  courseId: string;
  courseInstance: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const graderUserId = await getUserIdOrSetError(req, res);
  if (!graderUserId) return;
  const { answerId, answerClasses } = req.body as CreateGradingRequest;
  let { customFeedback } = req.body as CreateGradingRequest;
  const validatedAnswerClasses = normalizedValidAnswerClasses(answerClasses);
  customFeedback = customFeedback?.trim();
  if (!answerId || !validatedAnswerClasses) return res.status(422).end();

  const answerRows = await executeAndEndSet500OnError<AnswerOwnerRow[]>(
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

  const answerClassInsert = buildGradingAnswerClassInsert(validatedAnswerClasses);
  const transactionResult = await executeTxnAndEndSet500OnError(
    res,
    `INSERT INTO Grading (checkerId, answerId, reviewType, customFeedback, totalPoints) 
    VALUES (?,?,?,?,?)`,
    [
      graderUserId,
      answerId,
      reviewType,
      customFeedback,
      totalGradingPoints(validatedAnswerClasses),
    ],
    'SELECT LAST_INSERT_ID() AS insertId',
    [],
    `INSERT INTO GradingAnswerClass (${answerClassInsert.columns}) VALUES ${answerClassInsert.placeholders}`,
    answerClassInsert.params
  );
  if (!transactionResult) return;
  res.status(201).end();
}
