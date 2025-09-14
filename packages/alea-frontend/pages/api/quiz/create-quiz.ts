import { QuizWithStatus } from '@alea/spec';
import { doesQuizExist, writeQuizFile } from '@alea/node-utils';
import { Action, ResourceName } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfPostOrSetError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const {
    courseId,
    courseTerm,
    quizStartTs,
    quizEndTs,
    feedbackReleaseTs,
    manuallySetPhase,
    title,
    problems,
    css,
  } = req.body as QuizWithStatus;

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_QUIZ,
    Action.MUTATE,
    { courseId, instanceId: courseTerm }
  );
  if (!userId) return;

  const quiz = {
    id: 'quiz-' + uuidv4().substring(0, 8),
    version: 0,

    courseId,
    courseTerm,
    quizStartTs,
    quizEndTs,
    feedbackReleaseTs,
    manuallySetPhase,

    title,
    problems,
    css,
    updatedAt: Date.now(),
    updatedBy: userId,
  };

  if (doesQuizExist(quiz.id)) {
    res.status(500).json({ message: 'Quiz file already exists!' });
    return;
  }

  writeQuizFile(quiz);
  res.status(200).json({ quizId: quiz.id });
}
