import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfQueryParameterExistOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../../comment-utils';
import { isUserIdAuthorizedForAny } from '../../access-control/resource-utils';
import { Action, getCurrentTermForCourseId, ResourceName } from '@alea/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfQueryParameterExistOrSetError(req, res, 'courseId')) return;
  const courseId = req.query.courseId as string;
  const userId: string | undefined = await getUserIdOrSetError(req, res);
  if (
    !(await isUserIdAuthorizedForAny(userId, [
      {
        name: ResourceName.COURSE_HOMEWORK,
        action: Action.MUTATE,
        variables: { courseId: courseId, instanceId: await getCurrentTermForCourseId(courseId) },
      },
    ]))
  ) {
    res.status(403).end();
    return;
  }
  const answerId = +(req.query.answerId as string);
  const answer = await executeAndEndSet500OnError<any[]>(
    'SELECT	subProblemId, questionId, answer, userId FROM Answer WHERE	id = ? ',
    [answerId],
    res
  );
  res.send(answer[0]);
  return;
}
