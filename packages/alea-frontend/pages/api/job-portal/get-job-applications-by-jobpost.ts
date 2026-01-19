import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeDontEndSet500OnError } from '../comment-utils';
import { getJobPostByIdOrSetError } from './get-job-post-by-id';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, ResourceName } from '@alea/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const jobPostId = req.query.jobPostId as string;
  if (!jobPostId) return res.status(422).send('missing jobPostId');
  const jobPost = await getJobPostByIdOrSetError(jobPostId, res);
  if (!jobPost) return;
  const orgId = jobPost.organizationId;
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.JOB_PORTAL_ORG,
    Action.MANAGE_JOB_POSTS,
    { orgId: String(orgId) }
  );
  if (!userId) return;
  const results: any = await executeDontEndSet500OnError(
    `SELECT id,jobPostId,applicantId,applicationStatus,createdAt
    FROM jobApplication 
    WHERE jobPostId = ?`,
    [jobPostId],
    res
  );
  if (!results) return;
  res.status(200).json(results);
}
