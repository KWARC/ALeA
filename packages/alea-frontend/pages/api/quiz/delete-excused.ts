import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, ResourceName } from '@alea/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { quizId, userId, courseId, courseInstance } = req.body;
  if(!quizId || !userId || !courseId || !courseInstance) {
    return res.status(422).send('Missing required fields: quizId, userId, courseId, or courseInstance.');
  }
  const instructorId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_QUIZ,
    Action.MUTATE,
    { courseId, instanceId: courseInstance }    
  );
  if (!instructorId) return;
  const query = 'DELETE FROM excused WHERE userId = ? AND quizId = ?' ;
  const result = await executeAndEndSet500OnError(query, [userId, quizId], res);
  if (!result) return ;
  res.status(200).end();
}
