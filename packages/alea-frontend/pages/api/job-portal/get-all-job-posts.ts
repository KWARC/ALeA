import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  executeDontEndSet500OnError,
} from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';

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
    `SELECT id,jobCategoryId,organizationId ,session,jobTitle,jobDescription,workLocation,qualification,targetYears,openPositions,currency,stipend,facilities,applicationDeadline,createdAt,workMode
    FROM jobPost`,
    [],
    res
  );
  if (!results) return;
  res.status(200).json(results);
}
