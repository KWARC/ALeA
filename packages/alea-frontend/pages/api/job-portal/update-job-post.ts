import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeDontEndSet500OnError,
} from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, ResourceName } from '@alea/utils';
import { isValidCompensation } from './create-job-post';

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
    workLocation,
    workMode,
    jobDescription,
    compensation,
    facilities,
    qualification,
    targetYears,
    applicationDeadline,
    openPositions,
  } = req.body;
  if (!id) return res.status(422).send('Job Post Id is missing');
  if (
    !jobTitle ||
    !workLocation ||
    !workMode ||
    !jobDescription ||
    !qualification ||
    !targetYears ||
    !openPositions ||
    !facilities ||
    !applicationDeadline
  ) {
    return res.status(422).send('Missing required fields');
  }
  if (!isValidCompensation(compensation)) return res.status(422).end();
  const currentJobPost = await getJobPostUsingIdOrSet500OnError(id, res);
  if (!currentJobPost) return;
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.JOB_PORTAL_ORG,
    Action.MANAGE_JOB_POSTS,
    { orgId: currentJobPost.organizationId }
  );
  if (!userId) return;
  const applicationDeadlineMySQL = applicationDeadline
    ? new Date(applicationDeadline).toISOString().slice(0, 19).replace('T', ' ')
    : null;
  const result = await executeAndEndSet500OnError(
    'UPDATE jobPost SET jobTitle = ?, workLocation = ?,workMode=?, jobDescription = ?, compensation = ?, facilities=?,qualification=?,targetYears=?,applicationDeadline=?,openPositions=?,updatedAt =CURRENT_TIMESTAMP WHERE id = ?',
    [
      jobTitle,
      workLocation,
      workMode,
      jobDescription,
      JSON.stringify(compensation),
      facilities,
      qualification,
      targetYears,
      applicationDeadlineMySQL,
      openPositions,
      id,
    ],
    res
  );
  if (!result) return;

  res.status(200).end();
}
