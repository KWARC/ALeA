import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeDontEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';
import { normalizeJobPost } from './get-job-post';
import { JobPostInfo } from '@alea/spec';

export async function getJobPostByIdOrSetError(
  jobPostId: string,
  res: NextApiResponse
): Promise<JobPostInfo | undefined> {
  if (!jobPostId) {
    res.status(422).end();
    return;
  }
  const results: any = await executeDontEndSet500OnError(
    `SELECT id,jobCategoryId,organizationId ,session,jobTitle,jobDescription,workLocation,workMode,qualification,targetYears,openPositions,compensation,facilities,applicationDeadline
    FROM jobPost 
    WHERE id = ?`,
    [jobPostId],
    res
  );
  if (!results) return;
  if (!results.length) {
    res.status(404).end();
    return;
  }
  const job: any = results[0];
  const normalizedJobPost = normalizeJobPost(job);
  return normalizedJobPost;
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.JOB_PORTAL,
    Action.APPLY,
    { instanceId: CURRENT_TERM }
  );
  if (!userId) return;
  const jobPostId = req.query.jobPostId as string;
  const jobPost = await getJobPostByIdOrSetError(jobPostId, res);
  if (!jobPost) return;
  res.status(200).json(jobPost);
}
