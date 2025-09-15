import { NextApiRequest, NextApiResponse } from 'next';
import { deleteQuizFile } from '@alea/node-utils';
import { checkIfPostOrSetError } from '../comment-utils';
import { Action, ResourceName } from '@alea/utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { quizId, courseId, courseTerm } = req.body;
  if (!quizId) return res.status(422).send(`Missing Quiz id.`);
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_QUIZ,
    Action.MUTATE,
    { courseId, instanceId: courseTerm }
  );
  if (!userId) return;
  deleteQuizFile(quizId);
  res.status(200).end();
}
