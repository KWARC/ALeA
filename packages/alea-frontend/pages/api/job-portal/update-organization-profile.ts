import { Action, ResourceName } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { data, id } = req.body;
  if (!data || !id) return res.status(422).send('Missing required fields');
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.JOB_PORTAL_ORG,
    Action.MANAGE_JOB_POSTS,
    { orgId: id }
  );
  if (!userId) return;
  const {
    companyName,
    incorporationYear,
    isStartup,
    website,
    about,
    companyType,
    officeAddress,
    officePostalCode,
  } = data;
  const result = await executeAndEndSet500OnError(
    `UPDATE organizationProfile 
SET companyName = ?, 
    incorporationYear = ?, 
    isStartup = ?, 
    website = ?, 
    about = ?, 
    companyType = ?, 
    officeAddress = ?, 
    officePostalCode = ?
WHERE id = ?`,
    [
      companyName,
      incorporationYear,
      isStartup,
      website,
      about,
      companyType,
      officeAddress,
      officePostalCode,
      id,
    ],
    res
  );
  if (!result) return;
  res.status(200).end();
}
