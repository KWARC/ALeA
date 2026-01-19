import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@alea/utils';
import { getUserIdIfAuthorizedOrSetError } from '../../access-control/resource-utils';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
} from '../../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { universityId, instanceId, courseId } = req.body;

  if (!universityId || !instanceId || !courseId) {
    return res.status(422).end('Missing required fields: universityId, instanceId, courseId');
  }

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.UNIVERSITY_SEMESTER_DATA,
    Action.MUTATE,
    { universityId }
  );
  if (!userId) return;

  const deleteResult = await executeAndEndSet500OnError(
    `DELETE FROM courseMetadata WHERE courseId = ? AND instanceId = ?`,
    [courseId, instanceId],
    res
  );

  if (!deleteResult) return;

  res.status(200).json({ message: 'Course removed from semester successfully' });
}
