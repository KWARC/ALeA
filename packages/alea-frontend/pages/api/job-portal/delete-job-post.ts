import { Action, CURRENT_TERM, ResourceName } from '@stex-react/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getJobCategoryUsingIdOrSet500OnError } from './update-job-type';
import { getJobPostUsingIdOrSet500OnError } from './update-job-post';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { id } = req.body;
  if (!id) return res.status(422).send('Job Post id is missing');
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.JOB_PORTAL,
    Action.CREATE_JOB_POST,
    { instanceId: CURRENT_TERM }
  );
  if (!userId) return;

  const currentJobPost = await getJobPostUsingIdOrSet500OnError(id, res);
  if (!currentJobPost) return;
  const result = await executeAndEndSet500OnError('DELETE FROM jobpost WHERE id = ?', [id], res);
  if (!result) return;
  res.status(200).end();
}
