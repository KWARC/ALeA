import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError } from '../comment-utils';
import { checkResourceAssociatedOrSet500OnError } from './delete-acl';

export default async function handleCheckAclResources(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) {
    return;
  }
  const aclId = req.query.aclId as string;
  if (!aclId || typeof aclId !== 'string') {
    return res.status(422).send('Missing or invalid aclId parameter.');
  }
  try {
    const checkResult = await checkResourceAssociatedOrSet500OnError(aclId, res);
    if (!checkResult) return;
    res.status(200).json({ hasResources: checkResult.used });
  } catch (error) {
    console.error('Error in handleCheckAclResources:', error);
    res.status(500).json({ error: 'Internal Server Error: Failed to check ACL resources' });
  }
}