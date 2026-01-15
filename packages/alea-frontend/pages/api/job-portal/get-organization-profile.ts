import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  executeDontEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { OrganizationData } from '@alea/spec';
export async function getOrganizationProfileByIdOrSet500OnError(id: number, res: NextApiResponse) {
  const results: OrganizationData[] = await executeDontEndSet500OnError(
    `SELECT id,companyName,incorporationYear,isStartup, about, companyType,officeAddress,officePostalCode,website,domain
      FROM organizationProfile 
      WHERE id = ? 
      `,
    [id],
    res
  );
  if (!results) return;
  if (!results.length) return res.status(404).end();
  return results[0];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const id = req.query.id;
  if (!id) return res.status(422).send('Missing organizationId');
  const orgProfile = await getOrganizationProfileByIdOrSet500OnError(Number(id), res);
  if (!orgProfile) return;
  res.status(200).json(orgProfile);
}
