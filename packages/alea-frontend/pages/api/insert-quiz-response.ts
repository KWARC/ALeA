import { InsertAnswerRequest, Phase } from '@stex-react/api';
import { getPoints, getProblem, getQuizPhase } from '@stex-react/quiz-utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, getUserIdOrSetError } from './comment-utils';
import { queryGradingDbAndEndSet500OnError } from './grading-db-utils';
import { getQuiz } from './quiz-utils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const { quizId, problemId, responses, browserTimestamp_ms } =
    req.body as InsertAnswerRequest;

  const quiz = getQuiz(quizId);
  if (!quiz) {
    res.status(400).json({ message: `Quiz not found: [${quizId}]` });
    return;
  }
  const phase = getQuizPhase(quiz);
  if (phase !== Phase.STARTED) {
    const message = `Cannot record response. Phase is ${phase}.`;
    res.status(410).json({ message });
    return;
  }
  const problem = quiz.problems[problemId];
  if (!problem) {
    const message = `Problem not found in ${quizId}: [${problemId}]`;
    res.status(400).json({ message });
    return;
  }

  const points =
    getPoints(getProblem(problem, undefined), { responses });

  const results = await queryGradingDbAndEndSet500OnError(
    'INSERT INTO grading(userId, quizId, problemId, response, points, browserTimestamp_ms) VALUES (?, ?, ?, ?, ?, ?)',
    [
      userId,
      quizId,
      problemId,
      JSON.stringify(responses),
      points,
      browserTimestamp_ms,
    ],
    res
  );
  if (!results) return;

  res.status(204).end();
}
