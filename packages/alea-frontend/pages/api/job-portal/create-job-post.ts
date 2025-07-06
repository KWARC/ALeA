import { Action, ResourceName } from '@stex-react/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { organizationId } = req.body;
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.JOB_PORTAL_ORG,
    Action.MANAGE_JOB_POSTS,
    { orgId: organizationId }
  );
  if (!userId) return;
  const {
    jobCategoryId,
    session,
    jobTitle,
    jobDescription,
    trainingLocation,
    qualification,
    targetYears,
    openPositions,
    currency,
    stipend,
    facilities,
    applicationDeadline,
  } = req.body;

  const result = await executeAndEndSet500OnError(
    `INSERT INTO jobPost 
      (jobCategoryId,organizationId ,session,jobTitle,jobDescription,trainingLocation,qualification,targetYears,openPositions,currency,stipend,facilities,applicationDeadline) 
     VALUES (?,?,?, ?, ?, ?,?,?,?,?,?,?,?)`,
    [
      jobCategoryId,
      organizationId,
      session,
      jobTitle,
      jobDescription,
      trainingLocation,
      qualification,
      targetYears,
      openPositions,
      currency,
      stipend,
      facilities,
      applicationDeadline,
    ],
    res
  );
  if (!result) return;
  res.status(201).end();
}
