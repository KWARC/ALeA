import { getQuizPhase } from '@alea/quiz-utils';
import {
  FTMLProblemWithSolution,
  GetPreviousQuizInfoResponse,
  Phase,
  PreviousQuizInfo,
} from '@alea/spec';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdOrSetError } from '../../comment-utils';
import { getCurrentTermForCourseId } from '../../get-current-term';
import { queryGradingDbAndEndSet500OnError } from '../../grading-db-utils';
import { getAllQuizzes } from '../quiz-utils';

const USER_TO_QUIZ_SCORES_CACHE = new Map<string, { [quizId: string]: number }>();

// Quiz Id to (cacheTimestampMs, avgScore)
const QUIZ_AVG_SCORES_CACHE = new Map<string, { cacheTimestampMs: number; avgScore: number }>();

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
  quizIds: string[],
  res: NextApiResponse
): Promise<Map<string, number> | undefined> {
  const now = Date.now();
  const toRefreshQuizIds = new Set<string>();
  for (const quizId of quizIds) {
    const entry = QUIZ_AVG_SCORES_CACHE.get(quizId);
    if (!entry?.cacheTimestampMs || now > entry.cacheTimestampMs + 1000 * 60 * 20) {
      toRefreshQuizIds.add(quizId);
    }
  }

  if (toRefreshQuizIds.size > 0) {
    const cacheTimestampMs = Date.now();
    const quizAverages: { quizId: string; avgScore: number }[] =
      await queryGradingDbAndEndSet500OnError(
        `SELECT final_scores.quizId as quizId, AVG(final_scores.user_score) as avgScore 
        FROM (
            SELECT g.userId, g.quizId, SUM(g.points) as user_score
            FROM grading g
            INNER JOIN (
                SELECT quizId, userId, problemId, MAX(browserTimestamp_ms) AS max_ts
                FROM grading
                WHERE quizId IN ?
                GROUP BY quizId, userId, problemId
            ) latest 
            ON g.quizId = latest.quizId 
              AND g.userId = latest.userId 
              AND g.problemId = latest.problemId 
              AND g.browserTimestamp_ms = latest.max_ts
            GROUP BY g.userId, g.quizId
        ) final_scores
        GROUP BY final_scores.quizId`,
        [toRefreshQuizIds],
        res
      );
    if (!quizAverages) return;
    quizAverages.forEach(({ quizId, avgScore }) => {
      QUIZ_AVG_SCORES_CACHE.set(quizId, { cacheTimestampMs, avgScore });
    });
  }
  const quizAveragesMap = new Map<string, number>();
  for (const quizId of quizIds) {
    const avgScore = QUIZ_AVG_SCORES_CACHE.get(quizId)?.avgScore ?? 0;
    quizAveragesMap.set(quizId, avgScore);
  }
  return quizAveragesMap;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const courseId = req.query.courseId as string;
  let instanceId = req.query.instanceId as string;
  if (!instanceId) instanceId = await getCurrentTermForCourseId(courseId);
  const userScores = {}; // await getUserScoresOrSet500Error(userId, res); Disable to avoid performance issues
  if (!userScores) return;

  const relevantQuizzes = getAllQuizzes()
    .filter((q) => q.courseId === courseId && q.courseTerm === instanceId)
    .filter((q) => getQuizPhase(q) === Phase.FEEDBACK_RELEASED);
  const quizAverages = await getQuizAveragesOrSet500Error(
    relevantQuizzes.map((q) => q.id),
    res
  );
  if (!quizAverages) return;
  const quizInfo: { [quizId: string]: PreviousQuizInfo } = {};

  relevantQuizzes.forEach((quiz) => {
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
      r.problemHeader = problem && problem.problem ? problem.problem.title_html ?? '' : '';
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
