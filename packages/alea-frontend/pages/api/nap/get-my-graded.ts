import { executeAndEndSet500OnError, getUserIdOrSetError } from '../comment-utils';
import { GradingWithAnswer } from '@stex-react/spec';
import { NextApiRequest, NextApiResponse } from 'next';
import { addAnswerClassesToGradingOrSetError } from './nap-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const grading = await executeAndEndSet500OnError<GradingWithAnswer[]>(
    `SELECT Grading.id, Answer.questionTitle, Answer.subProblemId, Grading.answerId, Answer.questionId, Grading.reviewType, Grading.customFeedback, Grading.totalPoints, Grading.updatedAt,Answer.courseInstance,Answer.courseId,Answer.answer 
    FROM Answer INNER JOIN Grading ON Answer.id = Grading.answerId 
    WHERE Grading.checkerId = ? and Answer.homeworkId IS NULL 
    ORDER BY Grading.updatedAt DESC`,
    [userId],
    res
  );
  const gradingWithAnswerClasses = await addAnswerClassesToGradingOrSetError(grading, res);
  if (!gradingWithAnswerClasses) return;
  res.json(gradingWithAnswerClasses);
}
