import { GetCourseGradingItemsResponse } from '@alea/spec';
import { Action, ResourceName } from '@alea/utils';
import { getCurrentTermForCourseId } from '../get-current-term';
import { NextApiRequest, NextApiResponse } from 'next';
import { isUserIdAuthorizedForAny } from '../access-control/resource-utils';
import { checkIfGetOrSetError, getUserIdOrSetError } from '../comment-utils';
import { getGradingItemsOrSetError } from '../common-homework-utils';
import { getAllHomeworksOrSetError } from '../homework/get-homework-list';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const courseId = req.query.courseId as string;
  if (!courseId) return res.status(422).send('Missing params.');
  const instanceId =
    (req.query.courseInstance as string) ?? (await getCurrentTermForCourseId(courseId));
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const isInstructor = await isUserIdAuthorizedForAny(userId, [
    {
      name: ResourceName.COURSE_HOMEWORK,
      action: Action.INSTRUCTOR_GRADING,
      variables: { courseId: courseId, instanceId: instanceId },
    },
  ]);
  if (!isInstructor) {
    const isStudent = await isUserIdAuthorizedForAny(userId, [
      {
        name: ResourceName.COURSE_HOMEWORK,
        action: Action.TAKE,
        variables: {
          courseId,
          instanceId,
        },
      },
    ]);
    if (!isStudent) return res.status(403).end();
  }

  const homeworks = await getAllHomeworksOrSetError(courseId, instanceId, true, res);

  if (!homeworks) return res.status(404).end();

  const gradingItems = await getGradingItemsOrSetError(courseId, instanceId, !isInstructor, res);
  if (!gradingItems) return res.status(404).end();

  res.status(200).json({
    homeworks,
    gradingItems,
  } as GetCourseGradingItemsResponse);
}
