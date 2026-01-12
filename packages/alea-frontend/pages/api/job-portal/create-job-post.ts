import { Action, ResourceName } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { CompensationInfo } from '@alea/spec';
export function isValidCompensation(c: CompensationInfo): boolean {
  if (!c || !c.mode || !c.currency || !c.frequency) return false;
  if (c.mode === 'fixed') {
    return c.fixedAmount != null;
  }
  if (c.mode === 'range') {
    return c.minAmount != null || c.maxAmount != null;
  }
  return false;
}

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
    workLocation,
    workMode,
    qualification,
    targetYears,
    openPositions,
    compensation,
    facilities,
    applicationDeadline,
  } = req.body;
  if (
    !jobCategoryId ||
    !session ||
    !jobTitle ||
    !jobDescription ||
    !workLocation ||
    !workMode ||
    !qualification ||
    !targetYears ||
    !openPositions ||
    !facilities ||
    !applicationDeadline
  )
    return res.status(422).end();
  if (!isValidCompensation(compensation)) return res.status(422).end();

  const applicationDeadlineMySQL = applicationDeadline
    ? new Date(applicationDeadline).toISOString().slice(0, 19).replace('T', ' ')
    : null;

  const result = await executeAndEndSet500OnError(
    `INSERT INTO jobPost 
      (jobCategoryId,organizationId ,session,jobTitle,jobDescription,workLocation,workMode,qualification,targetYears,openPositions,compensation,facilities,applicationDeadline,createdByUserId) 
     VALUES (?,?,?, ?,?, ?, ?,?,?,?,?,?,?,?)`,
    [
      jobCategoryId,
      organizationId,
      session,
      jobTitle,
      jobDescription,
      workLocation,
      workMode,
      qualification,
      targetYears,
      openPositions,
      JSON.stringify(compensation),
      facilities,
      applicationDeadlineMySQL,
      userId,
    ],
    res
  );
  if (!result) return;
  res.status(201).end();
}
