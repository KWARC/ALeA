import {
  batchGradeHex,
  computePointsFromFeedbackJson,
  FTMLProblemWithSolution,
  RecorrectionInfo,
} from '@alea/spec';
import { getAllQuizzes } from '@alea/node-utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { queryGradingDbAndEndSet500OnError } from '../grading-db-utils';
import { updateQuizRecorrectionInfo } from './update-quiz';
import { checkIfPostOrSetError } from '../comment-utils';
import { Action, ResourceName } from '@alea/utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { FTML } from '@kwarc/ftml-viewer';

export interface GradingDbData {
  gradingId: number;
  problemId: string;
  quizId: string;
  response: string;
  points: number;
  userId?: string;
}

export interface GradingDbDataWithCorrectedPoints extends GradingDbData {
  correctedPoints: number;
}

export async function getCorrectedPoints(
  problems: { [problemUri: string]: FTMLProblemWithSolution },
  responses: GradingDbData[]
): Promise<{ results: GradingDbDataWithCorrectedPoints[]; missingIds: Record<string, number> }> {
  const withCorrectedPoints: GradingDbDataWithCorrectedPoints[] = [];
  const missingIds: Record<string, number> = {};

  const byProblemId = responses.reduce((acc, result) => {
    const { problemId } = result;
    if (!acc[problemId]) acc[problemId] = [];
    acc[problemId].push(result);
    return acc;
  }, {} as { [problemId: string]: GradingDbData[] });

  for (const problemId in byProblemId) {
    const problem = problems[problemId]?.problem;
    if (!problem) {
      missingIds[problemId] = (missingIds[problemId] || 0) + byProblemId[problemId].length;
      continue;
    }

    const responses: FTML.ProblemResponse[] = byProblemId[problemId].map((r) => {
      return JSON.parse(r.response) as FTML.ProblemResponse;
    });

    const feedbacks = (await batchGradeHex([[problems[problemId].solution, responses]]))?.[0];
    for (let i = 0; i < (feedbacks?.length ?? 0); i++) {
      const feedback = feedbacks[i];
      const gradingDbData = byProblemId[problemId][i];
      const correctedPoints = computePointsFromFeedbackJson(problem, feedback);
      withCorrectedPoints.push({ ...gradingDbData, correctedPoints });
    }
  }

  return { results: withCorrectedPoints, missingIds };
}

function findQuiz(quizId: string, courseId: string, courseTerm: string) {
  const allQuizzes = getAllQuizzes();
  return allQuizzes.find(
    (q) => q.id === quizId && q.courseId === courseId && q.courseTerm === courseTerm
  );
}

export function filterChangedResults(results: GradingDbDataWithCorrectedPoints[]) {
  return results.filter((result) => Math.abs(result.correctedPoints - result.points) > 0.01);
}

function buildChangeObjects(changedResults: GradingDbDataWithCorrectedPoints[]) {
  return changedResults.map((result) => ({
    gradingId: result.gradingId,
    problemId: result.problemId,
    oldPoints: result.points,
    newPoints: result.correctedPoints,
    studentId: result.userId,
  }));
}

async function applyChangesToDb(changes, res: NextApiResponse): Promise<void> {
  const updatePromises = changes.map((change) =>
    queryGradingDbAndEndSet500OnError(
      'UPDATE grading SET points = ? WHERE gradingId = ?',
      [change.newPoints, change.gradingId],
      res
    )
  );
  await Promise.all(updatePromises);
}

function prepareRecorrectionInfo(reasons): RecorrectionInfo[] {
  return Object.entries(reasons).map(([problemUri, description]) => ({
    problemUri: problemUri,
    description: String(description),
    recorrectedTs: new Date().toISOString(),
  }));
}

export function prepareProblemTitles(quiz): Record<string, { title_html: string }> {
  const problemsWithTitleHtml: Record<string, { title_html: string }> = {};
  for (const [problemUri, problemObj] of Object.entries(quiz.problems) as [
    string,
    FTMLProblemWithSolution
  ][]) {
    problemsWithTitleHtml[problemUri] = {
      title_html: problemObj.problem?.title_html || '',
    };
  }
  return problemsWithTitleHtml;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { quizId, courseId, courseTerm, dryRun, reasons } = req.body;
  if (!quizId || !courseId || !courseTerm) {
    return res.status(422).send('Missing required parameters');
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
    const quiz = findQuiz(quizId, courseId, courseTerm);
    if (!quiz) return res.status(404).send('Quiz not found');

    const results: GradingDbData[] = await queryGradingDbAndEndSet500OnError(
      'SELECT gradingId, userId, problemId, quizId, response, points FROM grading WHERE quizId = ?',
      [quizId],
      res
    );

    const { results: withCorrectedPoints, missingIds } = await getCorrectedPoints(
      quiz.problems,
      results
    );

    const changedResults = filterChangedResults(withCorrectedPoints);
    const changes = buildChangeObjects(changedResults);

    if (!dryRun && changes.length > 0) {
      await applyChangesToDb(changes, res);

      const recorrectionInfo = prepareRecorrectionInfo(reasons);
      console.log('Recorrection info:', recorrectionInfo);
      updateQuizRecorrectionInfo(quiz.id, recorrectionInfo);
    }

    const problems = prepareProblemTitles(quiz);

    return res.status(200).json({
      changedCount: changes.length,
      changes,
      missingProblemUri: missingIds,
      problems,
    });
  } catch (error) {
    console.error('Error in recorrection:', error);
    return res.status(500).send('Internal server error');
  }
}
