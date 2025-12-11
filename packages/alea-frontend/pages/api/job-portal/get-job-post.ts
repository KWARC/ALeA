import { Action, ResourceName } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfGetOrSetError, executeDontEndSet500OnError } from '../comment-utils';

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
  const results: any = await executeDontEndSet500OnError(
    `SELECT id,jobCategoryId,organizationId ,createdByUserId,session,jobTitle,jobDescription,trainingLocation,workMode,qualification,targetYears,openPositions,currency,stipend,facilities,applicationDeadline,createdAt
    FROM jobPost 
    WHERE organizationId = ?`,
    [organizationId],
    res
  );
  if (!results) return;
  res.status(200).json(results);
}
