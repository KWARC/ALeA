import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, ResourceName } from '@alea/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  const quizId = req.query.quizId as string;
  const courseId = req.query.courseId as string;
  const courseInstance = req.query.courseInstance as string;
  if (!quizId || !courseId || !courseInstance) {
    return res.status(422).send('Missing required fields: quizId, courseId, or courseInstance.');
  }
  const instructorId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_QUIZ,
    Action.MUTATE,
    { courseId, instanceId: courseInstance }
  );
  if (!instructorId) return;

  const query = `SELECT userId FROM excused WHERE quizId = ? AND courseId = ? AND courseInstance = ?`;
  const result = await executeAndEndSet500OnError(query, [quizId, courseId, courseInstance], res);
  if (!result) return;
  return res.status(200).json(result);
}
