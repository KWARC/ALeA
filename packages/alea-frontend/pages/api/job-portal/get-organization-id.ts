import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeDontEndSet500OnError } from '../comment-utils';

export async function getOrganizationIdOrSet500OnError(
  organizationName: string,
  res: NextApiResponse
) {
  if (!organizationName) {
     res.status(422).send('Missing organizationName.');
     return;
  }
  const result: any = await executeDontEndSet500OnError(
    `SELECT id
    FROM organizationProfile 
    WHERE companyName = ?`,
    [organizationName],
    res
  );
  if (!result || !result.length) return;
  return result[0].id as string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const organizationName = req.query.organizationName;
  const id = await getOrganizationIdOrSet500OnError(organizationName as string, res);
  if (!id) return;
  res.status(200).json(id);
}
