import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeDontEndSet500OnError,
} from '../comment-utils';
import { JobCategoryInfo } from '@stex-react/api';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, CURRENT_TERM, ResourceName } from '@stex-react/utils';

export async function getJobPostUsingIdOrSet500OnError(id: number, res: NextApiResponse) {
  const results: any = await executeDontEndSet500OnError(
    'SELECT * FROM jobPost WHERE id = ?',
    [id],
    res
  );
  if (!results) return;
  if (results.length === 0) {
    res.status(404).send('Job post not found');
    return;
  }
  return results[0];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const {
    id,
    jobTitle,
    trainingLocation,
    jobDescription,
    currency,
    stipend,
    facilities,
    qualification,
    targetYears,
    applicationDeadline,
    openPositions,
  } = req.body;
  if (!id) return res.status(422).send('Job Post Id is missing');
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.JOB_PORTAL,
    Action.MANAGE_JOB_POSTS,
    { instanceId: CURRENT_TERM }
  );
  if (!userId) return;

  const currentJobPost = await getJobPostUsingIdOrSet500OnError(id, res);
  if (!currentJobPost) return;
  const { updatedAt } = currentJobPost;

  const result = await executeAndEndSet500OnError(
    'UPDATE jobPost SET jobTitle = ?, trainingLocation = ?, jobDescription = ?, currency = ?, stipend=?,facilities=?,qualification=?,targetYears=?,applicationDeadline=?,openPositions=?,updatedAt=? WHERE id = ?',
    [
      jobTitle,
      trainingLocation,
      jobDescription,
      currency,
      stipend,
      facilities,
      qualification,
      targetYears,
      applicationDeadline,
      openPositions,
      updatedAt,
      id,
    ],
    res
  );
  if (!result) return;

  res.status(200).end();
}
