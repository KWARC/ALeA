import { FTMLProblemWithSolution } from '@stex-react/spec';
import { getAllQuizzes } from '@stex-react/node-utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { isMemberOfAcl } from '../acl-utils/acl-common-utils';
import { checkIfPostOrSetError, getUserIdOrSetError } from '../comment-utils';
import { queryGradingDbAndEndSet500OnError } from '../grading-db-utils';
import {
  filterChangedResults,
  getCorrectedPoints,
  GradingDbData,
  prepareProblemTitles,
} from './recorrect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const isSysAdmin = await isMemberOfAcl('sys-admin', userId);
  if (!isSysAdmin) return res.status(403).send('Forbidden');

  try {
    const quizzes = getAllQuizzes();

    const problems: { [problemUri: string]: FTMLProblemWithSolution } = {};
    for (const quiz of quizzes) {
      for (const [problemId, problem] of Object.entries(quiz.problems)) {
        problems[problemId] = problem;
      }
    }

    const results: GradingDbData[] = await queryGradingDbAndEndSet500OnError(
      'SELECT gradingId, userId, problemId, quizId, response, points FROM grading WHERE browserTimestamp_ms > 1745366400000',
      [],
      res
    );

    const { results: withCorrectedPoints, missingIds } = await getCorrectedPoints(
      problems,
      results
    );

    const changedResults = filterChangedResults(withCorrectedPoints);

    const changesByQuiz = changedResults.reduce((acc, result) => {
      const quiz = quizzes.find((q) => q.id === result.quizId);
      if (!quiz) return acc;

      const key = `${quiz.courseId}-${quiz.courseTerm}-${result.quizId}`;
      if (!acc[key]) {
        acc[key] = {
          courseId: quiz.courseId,
          courseTerm: quiz.courseTerm,
          quizId: result.quizId,
          changes: [],
        };
      }
      acc[key].changes.push({
        gradingId: result.gradingId,
        problemId: result.problemId,
        oldPoints: result.points,
        newPoints: result.correctedPoints,
        studentId: result.userId,
      });
      return acc;
    }, {});

    const problemTitles = {};
    for (const quiz of quizzes) {
      Object.assign(problemTitles, prepareProblemTitles(quiz));
    }

    return res.status(200).json({
      totalChanges: changedResults.length,
      changesByQuiz: Object.values(changesByQuiz),
      missingProblemUri: missingIds,
      problems: problemTitles,
    });
  } catch (error) {
    console.error('Error in global recorrection check:', error);
    return res.status(500).send('Internal server error');
  }
}
