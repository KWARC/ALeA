import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeDontEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';
import { JobPostInfo } from '@alea/spec';
import { normalizeJobPost } from './get-job-post';

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

  const results: any = await executeDontEndSet500OnError(
    `
    SELECT
      id,
      jobCategoryId,
      organizationId,
      session,
      jobTitle,
      jobDescription,
      workLocation,
      qualification,
      graduationYears,
      openPositions,
      compensation,
      facilities,
      workMode,
      UNIX_TIMESTAMP(applicationDeadline) * 1000 AS applicationDeadlineTimestamp_ms,
      createdAt
    FROM jobPost
    `,
    [],
    res
  );
  if (!results) return;
  const normalizedResults: JobPostInfo[] = results.map(normalizeJobPost);
  res.status(200).json(normalizedResults);
}
