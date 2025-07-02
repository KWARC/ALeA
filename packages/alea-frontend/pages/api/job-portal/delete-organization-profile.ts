import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeDontEndSet500OnError,
} from '../comment-utils';
import { OrganizationData } from '@stex-react/api';
async function getOrganizationProfileByIdOrSet500OnError(id: string, res: NextApiResponse) {
  const results: OrganizationData[] = await executeDontEndSet500OnError(
    `SELECT id,companyName,incorporationYear,isStartup, about, companyType,officeAddress,officePostalCode,website,domain
      FROM organizationProfile 
      WHERE id = ? 
      `,
    [id],
    res
  );
  if (!results || !results.length) return;
  return results[0];
}
export async function deleteOrganizationProfileOrSetError(id: string, res: NextApiResponse) {
  if (!id) return res.status(422).send('Organization id is missing');
  const orgProfile = await getOrganizationProfileByIdOrSet500OnError(id, res);
  if (!orgProfile) return;
  const result = await executeAndEndSet500OnError(
    'DELETE FROM organizationProfile WHERE id = ?',
    [id],
    res
  );
  if (!result) return;
  return true;
}
//risky , donot use unless necessary.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { id } = req.body;
  const result = await deleteOrganizationProfileOrSetError(id, res);
  if (!result) return;
  res.status(200).end();
}
