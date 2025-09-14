import { PerProblemStats, QuizStatsResponse } from '@alea/spec';
import { Action, ResourceName } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../../access-control/resource-utils';
import {
  queryGradingDbAndEndSet500OnError,
  queryGradingDbDontEndSet500OnError,
} from '../../grading-db-utils';
import { getQuiz } from '../quiz-utils';

function missingProblemData() {
  return {
    header: 'Missing problem',
    maxPoints: 0,
    satisfactory: 0,
    pass: 0,
    fail: 0,
    avgQuotient: 0,
  };
}

function numberBucket(n: number) {
  const lowerBound = Math.floor(n * 2) / 2;
  const upperBound = lowerBound + 0.5;
  return `[${lowerBound}, ${upperBound})`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const quizId = req.query.quizId as string;
  const courseId = req.query.courseId as string;
  const instanceId = req.query.courseTerm as string;
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_QUIZ,
    Action.PREVIEW,
    { courseId, instanceId }
  );
  if (!userId) return;

  const quiz = getQuiz(quizId);
  const perProblemStats: { [problemKey: string]: PerProblemStats } = {};
  for (const [problemId, problemWithSolution] of Object.entries(quiz.problems)) {
    const maxPoints = problemWithSolution.problem.total_points ?? 1;
    const header = problemWithSolution.problem.title_html ?? '';
    perProblemStats[problemId] = {
      header,
      maxPoints,
      satisfactory: 0,
      pass: 0,
      fail: 0,
      avgQuotient: 0,
    };
  }
  const totalPoints = Object.values(perProblemStats).reduce((acc, stat) => acc + stat.maxPoints, 0);

  const results1: any[] = await queryGradingDbDontEndSet500OnError(
    `SELECT numProblems, COUNT(*) AS numStudents
    FROM (
      SELECT userId, COUNT(*) AS numProblems
      FROM (
        SELECT problemId, userId
        FROM grading
        WHERE quizId = ?
        GROUP BY problemId, userId
      ) AS T1
      GROUP BY userId
    ) AS T2
    GROUP BY numProblems`,
    [quizId],
    res
  );
  if (!results1) return;
  const attemptedHistogram: { [attemptedProblems: number]: number } = {};
  for (const r1 of results1) {
    attemptedHistogram[r1.numProblems] = r1.numStudents;
  }
  const totalStudents = Object.values(attemptedHistogram).reduce((a, b) => a + +b, 0);
  const results2: any[] = await queryGradingDbDontEndSet500OnError(
    `SELECT score, COUNT(*) AS numStudents
    FROM (
      SELECT userId, SUM(points) as score
      FROM grading
      WHERE (quizId, problemId, userId, browserTimestamp_ms) IN (
        SELECT quizId, problemId, userId, MAX(browserTimestamp_ms) AS browserTimestamp_ms
        FROM grading
        WHERE quizId = ?
        GROUP BY quizId, problemId, userId
      )
      GROUP BY userId
    ) AS T1
    GROUP BY score`,
    [quizId],
    res
  );
  if (!results2) return;
  const scoreHistogram = {};
  for (const r2 of results2) {
    const { score } = r2;
    let key = '';
    if (score === 0) key = '0';
    else if (score === totalPoints) key = `${score}`;
    else key = numberBucket(score);
    if (!(key in scoreHistogram)) scoreHistogram[key] = 0;
    scoreHistogram[key] += r2.numStudents;
  }
  const results3: any[] = await queryGradingDbDontEndSet500OnError(
    `SELECT ROUND(UNIX_TIMESTAMP(postedTimestamp)/10)*10 AS ts, COUNT(*)/10 AS requestsPerSec 
    FROM grading
    WHERE quizId = ?
    GROUP BY ts`,
    [quizId],
    res
  );
  if (!results3) return;
  const requestsPerSec = {};
  for (const r3 of results3) {
    requestsPerSec[r3.ts] = r3.requestsPerSec;
  }

  const results4: any[] = await queryGradingDbAndEndSet500OnError(
    `SELECT quizId, problemId, points, COUNT(*) AS numStudents from grading 
    WHERE (quizId, problemId, userId, browserTimestamp_ms) IN ( 
        SELECT quizId, problemId, userId, MAX(browserTimestamp_ms) AS browserTimestamp_ms
        FROM grading
        WHERE quizId=?
        GROUP BY quizId, problemId, userId
    )
    GROUP BY quizId, problemId, points`,
    [quizId],
    res
  );
  if (!results4) return;

  for (const r4 of results4) {
    const problemId = r4.problemId;
    if (!(problemId in perProblemStats)) {
      perProblemStats[problemId] = missingProblemData();
    }
    const quotient = r4.points / perProblemStats[problemId].maxPoints;
    if (quotient < 0.5) {
      perProblemStats[problemId].fail += r4.numStudents;
    } else if (quotient <= 0.7) {
      perProblemStats[problemId].pass += r4.numStudents;
    } else {
      perProblemStats[problemId].satisfactory += r4.numStudents;
    }
  }

  const perProblemScoreSum = {};
  for (const result of results4) {
    const { problemId, points, numStudents } = result;
    if (!perProblemScoreSum[problemId]) {
      perProblemScoreSum[problemId] = 0;
    }
    perProblemScoreSum[problemId] += points * numStudents;
  }

  for (const problemId in perProblemScoreSum) {
    const sum = perProblemScoreSum[problemId];
    const average = sum / totalStudents;
    perProblemStats[problemId].avgQuotient = average / perProblemStats[problemId].maxPoints;
  }

  return res.status(200).json({
    attemptedHistogram,
    scoreHistogram,
    requestsPerSec,
    perProblemStats,
    totalStudents,
  } as QuizStatsResponse);
}
