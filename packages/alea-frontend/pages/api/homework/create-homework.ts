import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, ResourceName } from '@stex-react/utils';
import { CreateHomeworkRequest } from '@stex-react/spec';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { title, givenTs, dueTs, feedbackReleaseTs, courseId, courseInstance, css, problems } =
    req.body as CreateHomeworkRequest;
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_HOMEWORK,
    Action.MUTATE,
    { courseId, instanceId: courseInstance }
  );
  if (!userId) return;
  const result = await executeAndEndSet500OnError(
    'INSERT INTO homework (versionNo, title, givenTs, dueTs, feedbackReleaseTs, courseId, courseInstance, css, problems, updaterId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      0,
      title,
      givenTs,
      dueTs,
      feedbackReleaseTs,
      courseId,
      courseInstance,
      JSON.stringify(css),
      JSON.stringify(problems),
      userId,
    ],
    res
  );
  if (!result) return;
  res.status(200).end();
}
