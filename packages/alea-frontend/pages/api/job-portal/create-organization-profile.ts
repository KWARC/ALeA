import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';

export async function createOrganizationProfileOrSet500OnError(
  {
    companyName,
    domain,
    incorporationYear = null,
    isStartup = null,
    website = null,
    about = null,
    companyType = null,
    officeAddress = null,
    officePostalCode = null,
  }: {
    companyName: string;
    domain: string;
    incorporationYear?: string | null;
    isStartup?: boolean | null;
    website?: string | null;
    about?: string | null;
    companyType?: string | null;
    officeAddress?: string | null;
    officePostalCode?: string | null;
  },
  res: NextApiResponse
) {
  if (!companyName || !domain) return res.status(422).send('Missing required params');
  const result = await executeAndEndSet500OnError(
    `INSERT INTO organizationProfile 
      (companyName, incorporationYear, isStartup, website, domain, about, companyType, officeAddress, officePostalCode) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyName,
      incorporationYear,
      isStartup,
      website,
      domain,
      about,
      companyType,
      officeAddress,
      officePostalCode,
    ],
    res
  );
  return result;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const {
    companyName,
    incorporationYear,
    isStartup,
    website,
    domain,
    about,
    companyType,
    officeAddress,
    officePostalCode,
  } = req.body;

  const result = await createOrganizationProfileOrSet500OnError(
    {
      companyName,
      incorporationYear,
      isStartup,
      website,
      domain,
      about,
      companyType,
      officeAddress,
      officePostalCode,
    },
    res
  );
  if (!result) return;
  res.status(201).end();
}
