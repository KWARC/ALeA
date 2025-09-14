import { Action, ResourceName } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getHomeworkUsingIdOrSetError, updateHomeworkHistoryOrSetError } from './update-homework';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { id } = req.body;
  if (!id) return res.status(400).send('homework id is missing');

  const currentHomework = await getHomeworkUsingIdOrSetError(id, res);
  if (!currentHomework) return;
  const { courseId, courseInstance } = currentHomework;

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_HOMEWORK,
    Action.MUTATE,
    { courseId, instanceId: courseInstance }
  );
  if (!userId) return;

  const insertHistoryResult = updateHomeworkHistoryOrSetError(currentHomework, res);
  if (!insertHistoryResult) return;

  const result = await executeAndEndSet500OnError('DELETE FROM homework WHERE id = ?', [id], res);
  if (!result) return;
  res.status(200).end();
}
