import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeDontEndSet500OnError } from '../comment-utils';
export async function getOrganizationByDomainOrSet500OnError(domain: string, res: NextApiResponse) {
  if (!domain) return res.status(422).send('Invalid or missing domain.');
  const results: any = await executeDontEndSet500OnError(
    `SELECT id, companyName, domain FROM organizationProfile WHERE domain = ? LIMIT 1`,
    [domain],
    res
  );
  if (!results) return;
  return results;
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const { domain } = req.query;
  const results = await getOrganizationByDomainOrSet500OnError(domain as string, res);
  if (!results) return;
  return res.status(200).json(results);
}
