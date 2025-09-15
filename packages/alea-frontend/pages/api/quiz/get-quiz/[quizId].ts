import { FTMLProblemWithSolution, GetQuizResponse, Phase } from '@alea/spec';
import { getQuiz, getQuizTimes } from '@alea/node-utils';
import { getQuizPhase } from '@alea/quiz-utils';
import { Action, ResourceName, simpleNumberHash } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  isUserIdAuthorizedForAny,
  ResourceActionParams,
} from '../../access-control/resource-utils';
import { getUserIdOrSetError } from '../../comment-utils';
import { queryGradingDbAndEndSet500OnError } from '../../grading-db-utils';

async function getUserQuizResponseOrSetError(quizId: string, userId: string, res: NextApiResponse) {
  const results: any[] = await queryGradingDbAndEndSet500OnError(
    `SELECT problemId, response
    FROM grading
    WHERE (quizId, problemId, browserTimestamp_ms) IN (
        SELECT quizId, problemId, MAX(browserTimestamp_ms) AS browserTimestamp_ms
        FROM grading
        WHERE quizId = ? AND userId = ?
        GROUP BY problemId
    )`,
    [quizId, userId],
    res
  );
  if (!results) return undefined;
  const resp: { [problemId: string]: any } = {};

  for (const r of results) {
    const { problemId, response } = r;
    resp[problemId] = JSON.parse(response) as any;
  }
  return resp;
}

function shuffleArray(arr: any[], seed: number) {
  const numericHash = Math.abs(seed);

  //  Simplified Fisher-Yates shuffle algorithm
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(numericHash % (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function reorderBasedOnUserId(
  isModerator: boolean,
  problems: { [problemId: string]: FTMLProblemWithSolution },
  userId: string
) {
  if (isModerator) return problems;

  const problemIds = Object.keys(problems);
  shuffleArray(problemIds, simpleNumberHash(userId));
  const shuffled: { [problemId: string]: FTMLProblemWithSolution } = {};
  problemIds.forEach((problemId) => (shuffled[problemId] = problems[problemId]));
  return shuffled;
}

function getPhaseAppropriateProblems(
  problems: { [problemId: string]: FTMLProblemWithSolution },
  isModerator: boolean,
  phase: Phase
): { [problemId: string]: FTMLProblemWithSolution } {
  if (isModerator) return problems;
  switch (phase) {
    case Phase.STARTED:
    case Phase.ENDED: {
      const problemsCopy = {};
      for (const problemId in problems) {
        problemsCopy[problemId] = { problem: problems[problemId].problem, solution: undefined };
      }
      return problemsCopy;
    }
    case Phase.FEEDBACK_RELEASED:
      return problems;
    case Phase.NOT_STARTED:
    default:
      return {};
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string | GetQuizResponse>
) {
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const quizId = req.query.quizId as string;
  const quizInfo = getQuiz(quizId);
  const { courseTerm, courseId } = quizInfo;
  if (!quizInfo) {
    res.status(400).send(`Quiz not found: [${quizId}]`);
    return;
  }
  const moderatorActions: ResourceActionParams[] = [
    {
      name: ResourceName.COURSE_QUIZ,
      action: Action.MUTATE,
      variables: { courseId, instanceId: courseTerm },
    },
    {
      name: ResourceName.COURSE_QUIZ,
      action: Action.PREVIEW,
      variables: { courseId, instanceId: courseTerm },
    },
  ];
  const isModerator = await isUserIdAuthorizedForAny(userId, moderatorActions);

  const phase = getQuizPhase(quizInfo);
  const quizTimes = getQuizTimes(quizInfo);
  const problems = getPhaseAppropriateProblems(quizInfo.problems, isModerator, phase);
  const responses = await getUserQuizResponseOrSetError(quizId, userId, res);
  if (!responses) return;

  res.status(200).json({
    courseId,
    courseTerm,
    currentServerTs: Date.now(),
    ...quizTimes,
    phase,
    css: quizInfo.css,
    problems: reorderBasedOnUserId(isModerator, problems, userId),
    responses,
  } as GetQuizResponse);
  return;
}
