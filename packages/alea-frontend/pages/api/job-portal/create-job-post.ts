import { Action, ResourceName } from '@alea/utils';
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
    workLocation,
    workMode,
    qualification,
    graduationYears,
    openPositions,
    compensation,
    facilities,
    applicationDeadlineTimestamp_ms,
  } = req.body;
  if (
    !jobCategoryId ||
    !session ||
    !jobTitle ||
    !workMode ||
    !qualification ||
    !applicationDeadlineTimestamp_ms
  )
    return res.status(422).end();
  const normalizedOpenPositions = Number(openPositions) || 0;

  const result = await executeAndEndSet500OnError(
    `INSERT INTO jobPost 
      (jobCategoryId, organizationId, session, jobTitle, jobDescription, workLocation, workMode, qualification, graduationYears, openPositions, compensation, facilities, applicationDeadline, createdByUserId) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(? / 1000), ?)`,
    [
      jobCategoryId,
      organizationId,
      session,
      jobTitle,
      jobDescription,
      workLocation,
      workMode,
      qualification,
      graduationYears,
      normalizedOpenPositions,
      JSON.stringify(compensation),
      facilities,
      applicationDeadlineTimestamp_ms,
      userId,
    ],
    res
  );
  if (!result) return;
  res.status(201).end();
}
