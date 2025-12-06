import { GradingAnswerClass, GradingInfo, ReviewType } from '@alea/spec';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfQueryParameterExistOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export async function getAllGradingsOrSetError(
  subProblemToAnswerIds: Record<string, number>,
  res: NextApiResponse
) {
  if (Object.keys(subProblemToAnswerIds).length === 0) return {};

  const latestGrades = await executeAndEndSet500OnError<GradingInfo[]>(
    `SELECT id, checkerId, reviewType, answerId, customFeedback, totalPoints, createdAt, updatedAt
    FROM Grading
    WHERE (checkerId, answerId, updatedAt) IN (
      SELECT checkerId, answerId, MAX(updatedAt) AS updatedAt
      FROM Grading
      WHERE answerId IN (?)
      GROUP BY 1, 2
    )`,
    [Object.values(subProblemToAnswerIds)],
    res
  );
  if (!latestGrades) return;
  const latestInstructorGrade = latestGrades
    .filter((g) => g.reviewType === ReviewType.INSTRUCTOR)
    .sort((a, b) => {
      if (b.updatedAt < a.updatedAt) return -1;
      else return 1;
    })[0];
  const grades = latestGrades.filter(
    (g) => g.reviewType !== ReviewType.INSTRUCTOR || g.id === latestInstructorGrade?.id
  );

  const gradesAnswerClasses = !grades.length
    ? []
    : await executeAndEndSet500OnError<GradingAnswerClass[]>(
        `SELECT id, answerClassId, gradingId, points, isTrait, closed, title, description, count 
    FROM GradingAnswerClass 
    WHERE gradingId in (?)`,
        [grades.map((c) => c.id)],
        res
      );
  if (!gradesAnswerClasses) return;

  for (const grade of grades) {
    grade.answerClasses = gradesAnswerClasses.filter((c) => c.gradingId == grade.id);
  }

  const subProblemIdToGrades: Record<string, GradingInfo[]> = {};
  Object.entries(subProblemToAnswerIds).forEach(([subProblemId, answerId]) => {
    subProblemIdToGrades[subProblemId] = grades.filter((g) => g.answerId === answerId);
  });
  return subProblemIdToGrades;
}

export function convertToSubProblemIdToAnswerId(
  problemAnswers?: Record<string, { answer: string; id: number }>
) {
  return Object.entries(problemAnswers || {}).reduce((acc, [subProblemId, { id }]) => {
    acc[subProblemId] = id;
    return acc;
  }, {} as Record<string, number>);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfQueryParameterExistOrSetError(req, res, ['questionId'])) return;
  const answerId = +(req.query.answerId as string);

  const answerInfo = await executeAndEndSet500OnError<any[]>(
    `select userId,subProblemId from Answer where id = ?`,
    [answerId],
    res
  );

  res.send(answerInfo[0]);
}
