import { Action, ResourceName } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfGetOrSetError, executeDontEndSet500OnError } from '../comment-utils';
import { CompensationInfo, JobPostInfo } from '@alea/spec';
export function normalizeJobPost(jobPost: any): JobPostInfo {
  let compensation: CompensationInfo | null = null;
  if (jobPost.compensation) {
    try {
      compensation =
        typeof jobPost.compensation === 'string'
          ? JSON.parse(jobPost.compensation)
          : jobPost.compensation;
    } catch (err) {
      console.error('Error parsing compensation JSON for job id', jobPost.id, err);
      compensation = null;
    }
  }
  return { ...jobPost, compensation } as JobPostInfo;
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const organizationId = req.query.organizationId as string;
  if (!organizationId) return res.status(422).send('missing organizationId');
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.JOB_PORTAL_ORG,
    Action.MANAGE_JOB_POSTS,
    { orgId: organizationId }
  );
  if (!userId) return;
  const jobPosts: any = await executeDontEndSet500OnError(
    `
  SELECT 
    id,
    jobCategoryId,
    organizationId,
    createdByUserId,
    session,
    jobTitle,
    jobDescription,
    workLocation,
    workMode,
    qualification,
    graduationYears,
    openPositions,
    compensation,
    facilities,
    UNIX_TIMESTAMP(applicationDeadline) * 1000 AS applicationDeadlineTimestamp_ms,
    createdAt
  FROM jobPost
  WHERE organizationId = ?
  `,
    [organizationId],
    res
  );
  if (!jobPosts) return;
  const normalizedResults: JobPostInfo[] = jobPosts.map(normalizeJobPost);
  res.status(200).json(normalizedResults);
}
