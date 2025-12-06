import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeTxnAndEndSet500OnError,
} from '../comment-utils';
import {
  isCurrentUserMemberOfAClupdater,
  validateMemberAndAclIds,
} from '../acl-utils/acl-common-utils';
import { recomputeMemberships } from './recompute-memberships';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { id, description, isOpen, memberUserIds, memberACLIds, updaterACLId } = req.body;
  if (!id || !updaterACLId || isOpen === null || isOpen === undefined) {
    return res.status(422).send('Missing required fields.');
  }
  if (!(await isCurrentUserMemberOfAClupdater(id,res, req))) return res.status(403).end();
  if (!(await validateMemberAndAclIds(memberUserIds, memberACLIds))) {
    return res.status(422).send('Invalid items');
  }
  const result = await executeTxnAndEndSet500OnError(
    res,
    'UPDATE AccessControlList SET description=?, updaterACLId=?, isOpen=? WHERE id=?',
    [description, updaterACLId, !!isOpen, id],
    'DELETE FROM ACLMembership WHERE parentACLId=?',
    [id]
  );
  if (!result) return;
  const numMembershipRows = memberUserIds.length + memberACLIds.length;
  if (numMembershipRows > 0) {
    const values = new Array(numMembershipRows).fill('(?, ?, ?)');
    const memberQueryParams = [];
    for (const userId of memberUserIds) memberQueryParams.push(id, null, userId);
    for (const aclId of memberACLIds) memberQueryParams.push(id, aclId, null);
    const memberQuery = `INSERT INTO ACLMembership (parentACLId, memberACLId, memberUserId) VALUES 
    ${values.join(', ')}`;
    const resp = await executeAndEndSet500OnError(memberQuery, memberQueryParams, res);
    if (!resp) return;
  }
  await recomputeMemberships();
  return res.status(204).end();
}
