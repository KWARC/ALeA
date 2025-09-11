import { QuizWithStatus } from '@stex-react/spec';
import {
  doesQuizExist,
  getBackupQuizFilePath,
  getQuiz,
  writeQuizFile,
} from '@stex-react/node-utils';
import { Action, ResourceName } from '@stex-react/utils';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfPostOrSetError } from '../comment-utils';

// function to rewrite the quiz file with the new quiz info and backup the old version.
export function updateQuiz(quizId, updatedQuizFunc: (existingQuiz: QuizWithStatus) => QuizWithStatus) {
  // Save old version
  const existingQuiz = getQuiz(quizId);
  fs.writeFileSync(
    getBackupQuizFilePath(quizId, existingQuiz.version),
    JSON.stringify(existingQuiz, null, 2)
  );
  const updatedQuiz = updatedQuizFunc(existingQuiz);
  writeQuizFile(updatedQuiz);
}

export function updateQuizRecorrectionInfo(quizId: string, recorrectionInfo: QuizWithStatus['recorrectionInfo']) {
  updateQuiz(
    quizId,
    (existingQuiz) =>
      ({
        ...existingQuiz,
        version: existingQuiz.version + 1,
        recorrectionInfo: [
          ...(Array.isArray(existingQuiz.recorrectionInfo) ? existingQuiz.recorrectionInfo : []),
          ...(Array.isArray(recorrectionInfo) ? recorrectionInfo : [recorrectionInfo]),
        ],
        updatedAt: Date.now(),
      } as QuizWithStatus)
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const quiz = req.body as QuizWithStatus;
  const { courseId, courseTerm } = quiz;

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_QUIZ,
    Action.MUTATE,
    { courseId, instanceId: courseTerm }
  );
  if (!userId) return;

  if (!doesQuizExist(quiz?.id)) {
    res.status(400).json({ message: `Quiz not found: [${quiz?.id}]` });
    return;
  }

  updateQuiz(
    quiz.id,
    (existingQuiz) =>
      ({
        id: existingQuiz.id,
        version: existingQuiz.version + 1,

        courseId: quiz.courseId,
        courseTerm: existingQuiz.courseTerm,
        quizStartTs: quiz.quizStartTs,
        quizEndTs: quiz.quizEndTs,
        feedbackReleaseTs: quiz.feedbackReleaseTs,
        manuallySetPhase: quiz.manuallySetPhase,

        title: quiz.title,
        problems: quiz.problems,
        css: quiz.css,
        recorrectionInfo: existingQuiz.recorrectionInfo,
        updatedAt: Date.now(),
        updatedBy: userId,
      } as QuizWithStatus)
  );

  res.status(204).end();
}
