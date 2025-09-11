import {
  FTMLProblemWithSolution,
  GetPreviousQuizInfoResponse,
  Phase,
  PreviousQuizInfo,
} from '@stex-react/spec';
import { getQuizPhase } from '@stex-react/quiz-utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdOrSetError } from '../../comment-utils';
import { queryGradingDbAndEndSet500OnError } from '../../grading-db-utils';
import { getAllQuizzes } from '../quiz-utils';

const USER_TO_QUIZ_SCORES_CACHE = new Map<string, { [quizId: string]: number }>();
const QUIZ_AVG_SCORES_CACHE = new Map<string, number>();

async function getUserScoresOrSet500Error(
  userId: string,
  res: NextApiResponse
): Promise<{ [quizId: string]: number } | undefined> {
  if (USER_TO_QUIZ_SCORES_CACHE.size === 0) {
    const result: Array<any> = await queryGradingDbAndEndSet500OnError(
      `SELECT userId, quizId, sum(points) as score
      FROM grading
      WHERE (quizId, userId, problemId, browserTimestamp_ms) IN (
          SELECT quizId, userId,problemId, MAX(browserTimestamp_ms) AS browserTimestamp_ms
          FROM grading
          GROUP BY quizId, userId,problemId
      )
      GROUP BY userId,quizId;`,
      [],
      res
    );
    if (!result) return;
    result.forEach((quiz) => {
      const score = quiz['score'];
      const quizId = quiz['quizId'];
      const userId = quiz['userId'];
      if (!USER_TO_QUIZ_SCORES_CACHE.has(userId)) USER_TO_QUIZ_SCORES_CACHE.set(userId, {});
      USER_TO_QUIZ_SCORES_CACHE.get(userId)[quizId] = score;
    });
  }
  return USER_TO_QUIZ_SCORES_CACHE.get(userId) ?? {};
}

async function getQuizAveragesOrSet500Error(
  res: NextApiResponse
): Promise<Map<string, number> | undefined> {
  if (QUIZ_AVG_SCORES_CACHE.size !== 0) return QUIZ_AVG_SCORES_CACHE;

  const quizAverages: any[] = await queryGradingDbAndEndSet500OnError(
    `SELECT quizId, avg(score) as avgScore from(
        SELECT userId,quizId,sum(points) as score
        FROM grading
        WHERE (quizId, userId, problemId , browserTimestamp_ms) IN (
            SELECT quizId, userId,problemId, MAX(browserTimestamp_ms) AS browserTimestamp_ms
            FROM grading
            GROUP BY quizId, userId,problemId
        ) 
        GROUP BY userId,quizId) as t1
        GROUP BY quizId`,
    [],
    res
  );
  if (!quizAverages) return;
  quizAverages.forEach((quiz) => {
    const quizId = quiz['quizId'];
    const avgScore = quiz['avgScore'];
    QUIZ_AVG_SCORES_CACHE.set(quizId, avgScore);
  });
  return QUIZ_AVG_SCORES_CACHE;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const courseId = req.query.courseId as string;
  const userScores = {}; // await getUserScoresOrSet500Error(userId, res); Disable to avoid performance issues
  if (!userScores) return;

  const quizAverages = await getQuizAveragesOrSet500Error(res);
  if (!quizAverages) return;

  const allQuizzes = getAllQuizzes();
  const quizInfo: { [quizId: string]: PreviousQuizInfo } = {};
  allQuizzes
    .filter((q) => q.courseId === courseId)
    .filter((q) => getQuizPhase(q) === Phase.FEEDBACK_RELEASED)
    .forEach((quiz) => {
      const { problems, recorrectionInfo } = quiz;
      const problemByProblemId: { [problemId: string]: FTMLProblemWithSolution } = {};
      for (const problemId in problems) {
        problemByProblemId[problemId] = problems[problemId];
      }
      const maxPoints = Object.values(problemByProblemId).reduce(
        (acc, p) => acc + (p.problem.total_points ?? 1),
        0
      );
      for (const r of recorrectionInfo || []) {
        const problem = problemByProblemId[r.problemUri];
        r.problemHeader = problem && problem.problem ? (problem.problem.title_html ?? '') : '';
      }
      const quizId = quiz.id;
      quizInfo[quizId] = {
        score: userScores[quizId],
        averageScore: quizAverages.get(quizId),
        maxPoints,
        recorrectionInfo,
      } as PreviousQuizInfo;
    });

  res.status(200).send({ quizInfo } as GetPreviousQuizInfoResponse);
}
