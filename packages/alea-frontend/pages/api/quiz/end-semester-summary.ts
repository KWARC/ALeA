import { QuizWithStatus } from '@stex-react/spec';
import { getAllQuizzes } from '@stex-react/node-utils';
import { Action, ResourceName } from '@stex-react/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfPostOrSetError, executeQueryAndEnd } from '../comment-utils';
import { queryGradingDbAndEndSet500OnError } from '../grading-db-utils';

export interface QuizData {
  score: number;
  percentage: number;
}

export interface UserQuizData {
  perQuiz: Record<string, QuizData>;
  sumTopN: number;
}

function to2DecimalPoints(num: number) {
  return Math.round(num * 100) / 100;
}

function calculateMaxPoints(quizzes: QuizWithStatus[]): Record<string, number> {
  const maxPoints: Record<string, number> = {};
  for (const quiz of quizzes) {
    maxPoints[quiz.id] = 0;
    for (const ftmlProblem of Object.values(quiz.problems)) {
      maxPoints[quiz.id] += ftmlProblem?.problem?.total_points ?? 1;
    }
  }
  return maxPoints;
}

function calculateTopNAverage(userData: UserQuizData, topN: number, excusedCount: number): number {
  const quizPercentages = Object.values(userData.perQuiz).map((quizData) => quizData.percentage);
  quizPercentages.sort((a, b) => b - a);

  const remainingQuizzesAfterExcuses = topN - excusedCount;

  if (remainingQuizzesAfterExcuses > 0) {
    return (
      quizPercentages.slice(0, remainingQuizzesAfterExcuses).reduce((a, b) => a + b, 0) /
      remainingQuizzesAfterExcuses
    );
  } else {
    return 0;
  }
}

export async function getExcusedStudentsFromDB(
  quizId: string,
  courseId: string,
  courseInstance: string
): Promise<string[]> {
  const query = `SELECT userId FROM excused WHERE quizId = ? AND courseId = ? AND courseInstance = ?`;
  const result = await executeQueryAndEnd<{ userId: string }>(query, [
    quizId,
    courseId,
    courseInstance,
  ]);

  if (!result) return [];

  if ('error' in result) {
    throw result.error;
  }

  return Array.isArray(result) ? result.map((row) => row.userId) : [result.userId];
}

function buildCsvHeader(quizzes: QuizWithStatus[], topN: number): string[] {
  const header = ['user_id'];
  quizzes.forEach((quiz, idx) => {
    header.push(`(${idx + 1}) ${quiz.id}`, `(${idx + 1}) ${quiz.id} %`);
  });
  header.push(`Top ${topN} avg %`);
  return header;
}

function buildCsvRow(userId: string, userData: UserQuizData, quizzes: QuizWithStatus[]): string {
  const row = [userId];
  for (const quiz of quizzes) {
    const quizData = userData.perQuiz[quiz.id];
    if (quizData) {
      row.push(
        to2DecimalPoints(quizData.score).toString(),
        to2DecimalPoints(quizData.percentage).toString()
      );
    } else {
      row.push('0', '0');
    }
  }

  row.push(to2DecimalPoints(userData.sumTopN).toString());
  return row.join(',');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { courseId, courseTerm, excludeQuizzes = [], topN } = req.body;

  if (!courseId || !courseTerm) {
    return res.status(400).send('courseId and courseTerm are required');
  }

  const instructorId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_QUIZ,
    Action.MUTATE,
    { courseId, instanceId: courseTerm }
  );
  if (!instructorId) return;

  try {
    const quizzes: QuizWithStatus[] = getAllQuizzes()
      .sort((a, b) => a.quizStartTs - b.quizStartTs)
      .filter(
        (quiz) =>
          quiz.courseId === courseId &&
          quiz.courseTerm === courseTerm &&
          !excludeQuizzes.includes(quiz.id)
      );

    if (quizzes.length === 0) {
      return res.status(404).send('No quizzes found for the specified course');
    }

    const maxPoints = calculateMaxPoints(quizzes);

    const quizIds = quizzes.map((q) => q.id);
    const placeholders = quizIds.map(() => '?').join(', ');

    const results: any[] = await queryGradingDbAndEndSet500OnError(
      `SELECT userId, quizId, sum(points) as score
      FROM grading
      WHERE (quizId, userId, problemId, browserTimestamp_ms) IN (
        SELECT quizId, userId, problemId, MAX(browserTimestamp_ms) AS browserTimestamp_ms
        FROM grading
        WHERE quizId IN (${placeholders})
        GROUP BY quizId, userId, problemId
      )
      GROUP BY userId, quizId`,
      quizIds,
      res
    );

    const excusedData: Record<string, string[]> = {};

    for (const quiz of quizzes) {
      try {
        const excusedStudents = await getExcusedStudentsFromDB(
          quiz.id,
          quiz.courseId,
          quiz.courseTerm
        );
        excusedData[quiz.id] = excusedStudents;
      } catch (error) {
        console.warn(`Failed to get excused students for quiz ${quiz.id}:`, error);
        excusedData[quiz.id] = [];
      }
    }

    const userIdToQuizScores: Record<string, UserQuizData> = {};

    for (const result of results) {
      const { userId, quizId, score } = result;

      if (!userIdToQuizScores[userId]) {
        userIdToQuizScores[userId] = { perQuiz: {}, sumTopN: 0 };
      }

      userIdToQuizScores[userId].perQuiz[quizId] = {
        score,
        percentage: (score / maxPoints[quizId]) * 100,
      };
    }

    for (const [userId, userData] of Object.entries(userIdToQuizScores)) {
      const excusedCount = Object.values(excusedData).filter((userIds) =>
        userIds.includes(userId)
      ).length;
      userData.sumTopN = calculateTopNAverage(userData, topN, excusedCount);
    }

    const csvLines: string[] = [buildCsvHeader(quizzes, topN).join(',')];

    for (const [userId, userData] of Object.entries(userIdToQuizScores)) {
      csvLines.push(buildCsvRow(userId, userData, quizzes));
    }

    return res.status(200).json({
      message: 'End semester summary generated successfully',
      csvData: csvLines.join('\n'),
    });
  } catch (error) {
    console.error('Error generating end semester summary:', error);
    return res.status(500).json({
      error: 'Internal server error while generating summary',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
