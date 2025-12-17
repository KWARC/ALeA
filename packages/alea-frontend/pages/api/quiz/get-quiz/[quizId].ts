import { getQuiz, getQuizTimes } from '@alea/node-utils';
import { getQuizPhase } from '@alea/quiz-utils';
import { FTMLProblemWithSolution, GetQuizResponse, Phase } from '@alea/spec';
import { Action, ResourceName, simpleNumberHash } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { isUserIdAuthorizedForAny } from '../../access-control/resource-utils';
import { getUserIdOrSetError } from '../../comment-utils';
import { queryGradingDb, queryGradingDbAndEndSet500OnError } from '../../grading-db-utils';

async function getUserQuizResponseOrSetError(quizId: string, userId: string, res: NextApiResponse) {
  const results = await queryGradingDbAndEndSet500OnError<
    { problemId: string; response: string }[]
  >(
    `SELECT problemId, response
    FROM grading
    WHERE (quizId, problemId, browserTimestamp_ms) IN (
        SELECT quizId, problemId, MAX(browserTimestamp_ms) AS browserTimestamp_ms
        FROM grading
        WHERE quizId = ? AND userId = ?
        GROUP BY problemId
    )
    AND quizId = ? AND userId = ?`,
    [quizId, userId, quizId, userId],
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

async function isQuizModerator(userId: string, courseId: string, courseTerm: string) {
  return await isUserIdAuthorizedForAny(userId, [
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
  ]);
}

const LEARNERS_WITH_RESPONSES_CACHE = new Map<
  string,
  { learners: string[]; cacheCreated_ms: number }
>();
const LEARNERS_WITH_RESPONSES_CACHE_VALID_FOR_MS = 1000 * 6; // 6 seconds
const LEARNERS_WITH_RESPONSES_CACHE_REVALIDATE_MS = 1000 * 2; // 2 seconds

async function recomputeLearnersWithResponsesAndUpdateCache(quizId: string) {
  console.log('Recomputing learners with responses and updating cache for quiz:', quizId);
  const learnersWithResponses = await queryGradingDb<{ userId: string }[]>(
    `SELECT userId FROM grading WHERE quizId = ? GROUP BY userId`,
    [quizId]
  );
  if ('error' in learnersWithResponses) throw new Error('DB error');
  const learners = learnersWithResponses.map((learner) => learner.userId);
  LEARNERS_WITH_RESPONSES_CACHE.set(quizId, { learners, cacheCreated_ms: Date.now() });
  return learners;
}

async function getLearnersWithResponsesOrSetError(quizId: string, res: NextApiResponse) {
  const cachedLearnersWithResponses = LEARNERS_WITH_RESPONSES_CACHE.get(quizId);
  if (
    cachedLearnersWithResponses &&
    Date.now() - cachedLearnersWithResponses.cacheCreated_ms <
      LEARNERS_WITH_RESPONSES_CACHE_VALID_FOR_MS
  ) {
    return cachedLearnersWithResponses.learners;
  }
  try {
    return await recomputeLearnersWithResponsesAndUpdateCache(quizId);
  } catch (error) {
    console.error('Error recomputing learners with responses:', error);
    res.status(500).send('Internal server error');
    return;
  }
}

async function getResponsesOrSetError(
  quizId: string,
  isModerator: boolean,
  phase: Phase,
  userId: string,
  res: NextApiResponse
) {
  if (!isModerator && ![Phase.STARTED, Phase.ENDED, Phase.FEEDBACK_RELEASED].includes(phase)) {
    return {};
  }
  const learners = await getLearnersWithResponsesOrSetError(quizId, res);
  if (!learners) return;
  if (!learners.includes(userId)) return {};
  return await getUserQuizResponseOrSetError(quizId, userId, res);
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
  const isModerator = await isQuizModerator(userId, courseId, courseTerm);
  let targetUserId = userId;
  if (isModerator) {
    const inputTargetUserId = req.query.targetUserId as string;
    if (inputTargetUserId) targetUserId = inputTargetUserId;
  }
  const phase = getQuizPhase(quizInfo);
  const quizTimes = getQuizTimes(quizInfo);
  const problems = getPhaseAppropriateProblems(quizInfo.problems, isModerator, phase);
  const responses = await getResponsesOrSetError(quizId, isModerator, phase, targetUserId, res);
  if (!responses) return;

  res.status(200).json({
    courseId,
    courseTerm,
    currentServerTs: Date.now(),
    ...quizTimes,
    phase,
    css: quizInfo.css,
    problems: reorderBasedOnUserId(isModerator, problems, targetUserId),
    responses,
  } as GetQuizResponse);

  if (Date.now() - quizTimes.quizStartTs > LEARNERS_WITH_RESPONSES_CACHE_REVALIDATE_MS) {
    await recomputeLearnersWithResponsesAndUpdateCache(quizId);
  }
}
