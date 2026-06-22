import { CreateGradingRequest, NotificationType, ReviewType } from '@alea/spec';
import { Action, ResourceName } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { isUserIdAuthorizedForAny } from '../access-control/resource-utils';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeTxnAndEndSet500OnError,
  getUserIdOrSetError,
  sendNotification,
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
  questionId: string;
  homeworkId?: number;
}

interface ExistingGroupGradingCountRow {
  count: number;
}

async function sendGradingNotificationIfNeeded(
  answerRow: AnswerOwnerRow,
  graderUserId: string,
  reviewType: ReviewType,
  res: NextApiResponse
): Promise<boolean> {
  if (reviewType === ReviewType.SELF || answerRow.userId === graderUserId) return true;

  const existingGroupGradings = await executeAndEndSet500OnError<ExistingGroupGradingCountRow[]>(
    `SELECT COUNT(DISTINCT g.answerId) AS count
     FROM Answer a
     INNER JOIN Grading g ON g.answerId = a.id
     WHERE a.userId = ?
       AND a.questionId = ?
       AND a.courseId = ?
       AND a.courseInstance = ?
       AND IFNULL(a.homeworkId, 0) = IFNULL(?, 0)
       AND g.checkerId = ?
       AND g.reviewType = ?`,
    [
      answerRow.userId,
      answerRow.questionId,
      answerRow.courseId,
      answerRow.courseInstance,
      answerRow.homeworkId ?? 0,
      graderUserId,
      reviewType,
    ],
    res
  );
  if (!existingGroupGradings) return false;
  if (Number(existingGroupGradings[0]?.count ?? 0) > 1) return true;

  await sendNotification(
    answerRow.userId,
    'Your answer has been graded',
    '',
    'Ihre Antwort wurde bewertet',
    '',
    NotificationType.PEER_REVIEW,
    `/my-answers?questionId=${encodeURIComponent(answerRow.questionId)}`
  );
  return true;
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
    `SELECT userId, courseId, courseInstance, questionId, homeworkId FROM Answer WHERE id=?`,
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
    `INSERT INTO Grading (checkerId, answerId, reviewType, customFeedback, totalPoints, homeworkId)
     VALUES (?,?,?,?,?,?)`,
    [
      graderUserId,
      answerId,
      reviewType,
      customFeedback,
      totalGradingPoints(validatedAnswerClasses),
      answerRow.homeworkId ?? null,
    ],
    'SELECT LAST_INSERT_ID() AS insertId',
    [],
    `INSERT INTO GradingAnswerClass (${answerClassInsert.columns}) VALUES ${answerClassInsert.placeholders}`,
    answerClassInsert.params
  );
  if (!transactionResult) return;

  const notificationSentOrSkipped = await sendGradingNotificationIfNeeded(
    answerRow,
    graderUserId,
    reviewType,
    res
  );
  if (!notificationSentOrSkipped) return;

  res.status(201).end();
}
