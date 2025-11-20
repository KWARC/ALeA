import { getAllQuizzes } from '@alea/node-utils';
import { Action, ResourceName } from '@alea/utils';
import { getCurrentTermForCourseId } from '../get-current-term';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const courseId = req.query.courseId as string;
  if (!courseId) return res.status(400).json({ message: 'Missing courseId.' });
  let instanceId = req.query.instanceId as string;
  if (!instanceId) instanceId = await getCurrentTermForCourseId(courseId);

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_QUIZ,
    Action.MUTATE,
    { courseId, instanceId }
  );
  if (!userId) return;

  const relevantQuizzes = getAllQuizzes().filter(
    (quiz) => quiz.courseId === courseId && quiz.courseTerm === instanceId
  );
  res.status(200).json(relevantQuizzes);
}
