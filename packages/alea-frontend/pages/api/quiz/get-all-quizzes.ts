import type { QuizWithStatus } from '@alea/spec';
import { getAllQuizzes } from '@alea/node-utils';
import { Action, ResourceName } from '@alea/utils';
import { getCurrentTermForCourseId } from '../get-current-term';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import fs from 'fs';
import path from 'path';

function matchesQuiz(quiz: QuizWithStatus, courseId: string, instanceId: string) {
  return (
    quiz.courseId === courseId &&
    quiz.courseTerm?.toLowerCase() === instanceId.toLowerCase()
  );
}

function getArchivedQuizzes(courseId: string, instanceId: string) {
  const quizInfoDir = process.env.QUIZ_INFO_DIR;
  if (!quizInfoDir) return [];

  const archiveRoot = path.join(quizInfoDir, 'archive');
  if (!fs.existsSync(archiveRoot)) return [];

  const archiveTerm = fs
    .readdirSync(archiveRoot, { withFileTypes: true })
    .find((entry) => entry.isDirectory() && entry.name.toLowerCase() === instanceId.toLowerCase());
  if (!archiveTerm) return [];

  const archiveDir = path.join(archiveRoot, archiveTerm.name);
  if (!fs.existsSync(archiveDir)) return [];

  return fs
    .readdirSync(archiveDir)
    .filter((file) => file.startsWith('quiz-') && file.endsWith('.json'))
    .map(
      (file) =>
        JSON.parse(fs.readFileSync(path.join(archiveDir, file), 'utf-8')) as QuizWithStatus
    )
    .filter((quiz) => matchesQuiz(quiz, courseId, instanceId));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const courseId = req.query.courseId as string;
  if (!courseId) return res.status(400).json({ message: 'Missing courseId.' });
  const currentTerm = await getCurrentTermForCourseId(courseId);
  let instanceId = (req.query.instanceId as string) || (req.query.courseTerm as string);
  if (!instanceId) instanceId = currentTerm;
  if (!instanceId) return res.status(400).json({ message: 'Missing instanceId.' });

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_QUIZ,
    Action.MUTATE,
    { courseId, instanceId }
  );
  if (!userId) return;

  const isCurrentTerm = currentTerm?.toLowerCase() === instanceId.toLowerCase();
  const relevantQuizzes =
    isCurrentTerm
      ? getAllQuizzes().filter((quiz) => matchesQuiz(quiz, courseId, instanceId))
      : getArchivedQuizzes(courseId, instanceId);

  res.status(200).json(relevantQuizzes);
}
