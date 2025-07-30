import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError } from '../comment-utils'; 
import { checkResourcesassociatedOrSet500OnError } from '../acl-utils/acl-common-utils'; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const aclId = req.query.aclId as string;
  if (!aclId || typeof aclId !== 'string') {
    return res.status(422).send('Missing aclId parameter.');
  }
  try {
    const hasResources = await checkResourcesassociatedOrSet500OnError(aclId, res);
    res.status(200).json({ hasResources: hasResources });
  } catch (error) {
    console.error("Error checking ACL resources:", error);
    res.status(500).json({ error: 'Failed to check ACL resources' });
  }
}