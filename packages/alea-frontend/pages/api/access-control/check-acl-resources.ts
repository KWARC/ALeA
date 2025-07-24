// packages/alea-frontend/pages/api/access-control/check-acl-resources.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError } from '../comment-utils'; // Assuming you have a checkIfGetOrSetError
import { checkResourcesassociatedOrSet500OnError } from '../acl-utils/acl-common-utils'; // This function is already in your delete-acl.ts, consider moving it to acl-common-utils.ts if it's not already there.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return; // Ensure it's a GET request

  const aclId = req.query.aclId as string;

  if (!aclId || typeof aclId !== 'string') {
    return res.status(422).send('Missing aclId parameter.');
  }

  try {
    // Re-use your existing logic to check for associated resources
    const hasResources = await checkResourcesassociatedOrSet500OnError(aclId, res);

    // Send a boolean response
    res.status(200).json({ hasResources: hasResources });
  } catch (error) {
    console.error("Error checking ACL resources:", error);
    res.status(500).json({ error: 'Failed to check ACL resources' });
  }
}
