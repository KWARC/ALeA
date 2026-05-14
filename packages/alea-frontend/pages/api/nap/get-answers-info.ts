import { GradingAnswerClass, GradingInfo, ReviewType } from '@alea/spec';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfQueryParameterExistOrSetError, executeAndEndSet500OnError } from '../comment-utils';

function sqlInPlaceholders(n: number): string {
  return Array(Math.max(n, 1)).fill('?').join(',');
}

export async function getAllGradingsOrSetError(
  subProblemToAnswerIds: Record<string, number>,
  res: NextApiResponse
) {
  if (Object.keys(subProblemToAnswerIds).length === 0) return {};
  const answerIdsForIn = [
    ...new Set(
      Object.values(subProblemToAnswerIds)
        .map((id) => Number(id))
        .filter(Number.isFinite)
    ),
  ];
  if (answerIdsForIn.length === 0) return {};
  const answerIn = sqlInPlaceholders(answerIdsForIn.length);
  // Prefer MAX(id) over MAX(updatedAt): tuple equality on updatedAt misses rows when DB/driver
  // truncate or format TIMESTAMP differently than the aggregated MAX(updatedAt).
  // Use explicit `(?, ?, ...)` placeholders: Prisma/MySQL `$queryRawUnsafe(..., [[id]])` for `IN (?)` often binds wrong.
  const latestGrades = await executeAndEndSet500OnError<GradingInfo[]>(
    `SELECT g.id, g.checkerId, g.reviewType, g.answerId, g.customFeedback, g.totalPoints, g.createdAt, g.updatedAt
    FROM Grading g
    WHERE g.id IN (
      SELECT MAX(g2.id)
      FROM Grading g2
      WHERE g2.answerId IN (${answerIn})
      GROUP BY g2.checkerId, g2.answerId
    )`,
    answerIdsForIn,
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

  const gradingIds = grades.map((g) => g.id).filter((id) => Number.isFinite(Number(id)));
  const gradesAnswerClasses = !gradingIds.length
    ? []
    : await executeAndEndSet500OnError<GradingAnswerClass[]>(
        `SELECT id, answerClassId, gradingId, points, isTrait, closed, title, description, count 
    FROM GradingAnswerClass 
    WHERE gradingId IN (${sqlInPlaceholders(gradingIds.length)})`,
        gradingIds,
        res
      );
  if (!gradesAnswerClasses) return;

  for (const grade of grades) {
    grade.answerClasses = gradesAnswerClasses.filter((c) => c.gradingId == grade.id);
  }

  const subProblemIdToGrades: Record<string, GradingInfo[]> = {};
  Object.entries(subProblemToAnswerIds).forEach(([subProblemId, answerIdNum]) => {
    const aid = Number(answerIdNum);
    subProblemIdToGrades[subProblemId] = grades.filter((g) => Number(g.answerId) === aid);
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

  const answerInfo = await executeAndEndSet500OnError<{ userId: string; subProblemId: string }[]>(
    `select userId,subProblemId from Answer where id = ?`,
    [answerId],
    res
  );

  res.send(answerInfo[0]);
}
