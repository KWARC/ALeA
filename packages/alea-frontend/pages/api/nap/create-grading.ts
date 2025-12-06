import { CreateGradingRequest, ReviewType } from '@alea/spec';
import { Action, ResourceName } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { isUserIdAuthorizedForAny } from '../access-control/resource-utils';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const checkerId = await getUserIdOrSetError(req, res);
  if (!checkerId) return;
  const { answerId } = req.body as CreateGradingRequest;
  let { customFeedback, answerClasses } = req.body as CreateGradingRequest;
  answerClasses = answerClasses?.filter((c) => c.count !== 0);
  customFeedback = customFeedback?.trim();
  if (!answerId || !answerClasses?.length) return res.status(422).end();

  for (const element of answerClasses) {
    if (
      !element.answerClassId ||
      element.closed === null ||
      element.isTrait === null ||
      !element.description ||
      !element.title ||
      !element.points === null
    )
      return res.status(422).end();
  }

  const answers = await executeAndEndSet500OnError(
    `SELECT userId, courseId, courseInstance FROM Answer WHERE id=?`,
    [answerId],
    res
  );
  if (!answers) return;
  if (!answers.length) return res.status(404).send('Answer not found');
  const answer = answers[0];
  const isInstructor = await isUserIdAuthorizedForAny(checkerId, [
    {
      name: ResourceName.COURSE_HOMEWORK,
      action: Action.INSTRUCTOR_GRADING,
      variables: { courseId: answer.courseId, instanceId: answer.courseInstance },
    },
  ]);
  const reviewType =
    checkerId === answer.userId
      ? ReviewType.SELF
      : isInstructor
      ? ReviewType.INSTRUCTOR
      : ReviewType.PEER;

  let totalPoints = 0;
  for (const answerClass of answerClasses) {
    totalPoints += answerClass.count * answerClass.points;
  }
  const gradingResult = await executeAndEndSet500OnError(
    `INSERT INTO Grading (checkerId, answerId, reviewType, customFeedback, totalPoints) 
    VALUES (?,?,?,?,?)`,
    [checkerId, answerId, reviewType, customFeedback, totalPoints],
    res
  );
  if (!gradingResult) return;
  const answerClassesParams = answerClasses.flatMap((c) => [
    gradingResult.insertId,
    c.answerClassId,
    c.points,
    c.isTrait,
    c.closed,
    c.title,
    c.description,
    c.count,
  ]);
  const values = new Array(answerClasses.length).fill('(?, ?, ?, ?, ?, ?, ?, ?)');
  await executeAndEndSet500OnError(
    `INSERT INTO GradingAnswerClass (gradingId, answerClassId, points, isTrait, closed, title, description, count)
    VALUES ${values.join(', ')}`,
    answerClassesParams,
    res
  );
  res.status(201).end();
}
