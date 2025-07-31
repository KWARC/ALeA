import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeTxnAndEndSet500OnError,
} from '../comment-utils';
import { isCurrentUserMemberOfAClupdater } from '../acl-utils/acl-common-utils';

export async function checkResourceAssociatedOrSet500OnError(aclId: string, res) {
  const resources = await executeAndEndSet500OnError(
    'select resourceId from resourceAccess where aclId=? LIMIT 1',
    [aclId],
    res
  );
  if (!resources) return;
  return { used: resources.length > 0 };
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const id = req.body.id as string;
  if (!id || typeof id !== 'string') return res.status(422).send('Missing id.');
  if (!(await isCurrentUserMemberOfAClupdater(id, res, req))) return res.status(403).end();
  const check = await checkResourceAssociatedOrSet500OnError(id, res);
  if (!check) return;
  if (check.used) {
    return res
      .status(400)
      .json({ error: 'Resources are still linked with this ACL.cannot delete.' });
  }
  const result = await executeTxnAndEndSet500OnError(
    res,
    'DELETE FROM AccessControlList WHERE id=?',
    [id],
    'DELETE FROM ACLMembership WHERE parentACLId=?',
    [id]
  );
  if (!result) return;
  res.status(200).end();
}