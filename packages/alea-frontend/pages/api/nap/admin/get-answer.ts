import { Action, ResourceName } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { isUserIdAuthorizedForAny } from '../../access-control/resource-utils';
import {
  checkIfQueryParameterExistOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../../comment-utils';
import { getCurrentTermForCourseId } from '../../get-current-term';

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
    'SELECT subProblemId, questionId, answer, userId, courseId, courseInstance FROM Answer WHERE id = ?',
    [answerId],
    res
  );
  if (!answer?.length) return res.status(404).end();

  const base = answer[0];
  const allResponses = await executeAndEndSet500OnError<any[]>(
    `SELECT subProblemId, answer
     FROM Answer
     WHERE questionId = ? AND userId = ? AND courseId = ? AND courseInstance = ?
     ORDER BY subProblemId`,
    [base.questionId, base.userId, base.courseId, base.courseInstance],
    res
  );
  if (!allResponses) return;

  res.send({
    ...base,
    responses: allResponses,
  });
}
