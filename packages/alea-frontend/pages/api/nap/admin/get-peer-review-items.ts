import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  checkIfQueryParameterExistOrSetError,
  executeAndEndSet500OnError,
} from '../../comment-utils';
import { getUserIdIfAnyAuthorizedOrSetError } from '../../access-control/resource-utils';
import { Action, ResourceName } from '@alea/utils';
import { getCurrentTermForCourseId } from '@alea/utils';
import { GradingWithAnswer } from '@alea/spec';
import { addAnswerClassesToGradingOrSetError } from '../nap-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  if (!checkIfQueryParameterExistOrSetError(req, res, 'courseId')) return;
  const courseId = req.query.courseId as string;
  const userId = await getUserIdIfAnyAuthorizedOrSetError(req, res, [
    {
      name: ResourceName.COURSE_PEERREVIEW,
      action: Action.MUTATE,
      variables: { courseId: courseId, instanceId: await getCurrentTermForCourseId(courseId) },
    },
  ]);
  if (!userId) return;
  
  const grading = await executeAndEndSet500OnError<GradingWithAnswer[]>(
    `SELECT Grading.id, Answer.questionTitle, Answer.subProblemId, Grading.answerId,Grading.checkerId,Answer.questionId,Grading.reviewType,Grading.customFeedback,Grading.totalPoints,Grading.updatedAt,Answer.courseInstance,Answer.courseId,Answer.answer 
    FROM Answer INNER JOIN Grading ON Answer.id = Grading.answerId 
    WHERE Answer.courseId = ? and Answer.homeworkId IS NULL
    ORDER BY Grading.updatedAt DESC`,
    [courseId],
    res
  );
  if(!grading) return;
  const gradingWithAnswerClasses = await addAnswerClassesToGradingOrSetError(grading, res);
  if (!gradingWithAnswerClasses) return;
  res.json(gradingWithAnswerClasses);
}
