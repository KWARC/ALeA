import { QuizStubInfo } from '@alea/spec';
import { getCurrentTermForCourseId } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getAllQuizzes } from '../quiz-utils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const courseId = req.query.courseId as string;
  if (!courseId) {
    res.status(400).send({ message: 'Missing courseId.' });
    return;
  }

  const currentTerm = await getCurrentTermForCourseId(courseId);
  const quizzesInfo: QuizStubInfo[] = getAllQuizzes()
    .filter((q) => q.courseId === courseId && q.courseTerm === currentTerm)
    .map((q) => ({
      quizId: q.id,
      quizStartTs: q.quizStartTs,
      quizEndTs: q.quizEndTs,
      title: q.title,
      css: q.css,
    }));

  res.status(200).json(quizzesInfo);
}
