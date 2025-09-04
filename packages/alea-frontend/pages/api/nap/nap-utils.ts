import { GradingWithAnswer, GradingAnswerClass } from '@stex-react/spec';
import { NextApiResponse } from 'next';
import { executeAndEndSet500OnError } from '../comment-utils';

export async function addAnswerClassesToGradingOrSetError(
  grading: GradingWithAnswer[],
  res: NextApiResponse
) {
  if (grading.length === 0) return grading;
  const gradingAnswerClasses = await executeAndEndSet500OnError<GradingAnswerClass[]>(
    `SELECT gradingId,answerClassId,points,isTrait,closed,title,description,count from GradingAnswerClass where gradingId in (?)`,
    [grading.map((c) => c.id)],
    res
  );
  if (!gradingAnswerClasses) return;
  for (const grade of grading) {
    grade.answerClasses = gradingAnswerClasses.filter((c) => c.gradingId == grade.id);
  }
  return grading;
}
