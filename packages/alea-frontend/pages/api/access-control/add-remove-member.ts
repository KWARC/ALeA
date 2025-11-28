import { AccessControlList } from '@alea/spec';
import { NextApiRequest, NextApiResponse } from 'next';
import { isCurrentUserMemberOfAClupdater } from '../acl-utils/acl-common-utils';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { recomputeMemberships } from './recompute-memberships';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const memberId = req.body.memberId as string;
  const aclId = req.body.aclId as string;
  const isAclMember = req.body.isAclMember as boolean;
  const toBeAdded = req.body.toBeAdded as boolean;
  const userId = await getUserIdOrSetError(req, res);
  if (!aclId || !memberId || isAclMember === null || toBeAdded === null) {
    return res.status(422).send('Missing fields.');
  }
  const acl: AccessControlList = (
    await executeAndEndSet500OnError(
      'select isOpen from AccessControlList where id=?',
      [aclId],
      res
    )
  )[0];
  // check if in updaterACL or (1) isOpen for self-additions (2) is self deletion
  let query = '';
  let params: string[] = [];
  if (toBeAdded) {
    if (!(acl?.isOpen || (await isCurrentUserMemberOfAClupdater(aclId, res, req))))
      return res.status(403).end();
    if (isAclMember) query = 'select id from AccessControlList where id=?';
    else query = 'select userId from userInfo where userId=?';
    const itemsExist = (await executeAndEndSet500OnError(query, [memberId], res))[0];
    if (itemsExist?.length) return res.status(422).send('Invalid input');

    const memberField = isAclMember ? 'memberACLId' : 'memberUserId';
 
    const checkMembershipQuery = `SELECT id FROM ACLMembership WHERE parentACLId=? AND ${memberField}=?`;
    const existingMembership = await executeAndEndSet500OnError(
      checkMembershipQuery,
      [aclId, memberId],
      res
    );

    if (existingMembership && existingMembership.length > 0) {
      res.status(200).end();
      return;
    }
    query = 'INSERT INTO ACLMembership (parentACLId, memberACLId, memberUserId) VALUES (?, ?, ?)';
    params = isAclMember ? [aclId, memberId, null] : [aclId, null, memberId];
  } else {
    if (!(await isCurrentUserMemberOfAClupdater(aclId, res, req)) && memberId != userId)
      return res.status(403).end();
    const memberField = isAclMember ? 'memberACLId' : 'memberUserId';
    query = `DELETE FROM ACLMembership WHERE parentACLId=? AND ${memberField} = ?`;
    params = [aclId, memberId];
  }
  await executeAndEndSet500OnError(query, params, res);
  await recomputeMemberships();
  res.status(200).end();
}
