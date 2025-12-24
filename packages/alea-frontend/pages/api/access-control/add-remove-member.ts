import { NextApiRequest, NextApiResponse } from 'next';
import { isCurrentUserMemberOfAClupdater } from '../acl-utils/acl-common-utils';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeQuery,
  getUserIdOrSetError,
} from '../comment-utils';
import { recomputeMemberships } from './recompute-memberships';

// Returns false if the acl is not found or in case of db error.
async function isAclOpen(aclId: string) {
  const queryResult = await executeQuery('select isOpen from AccessControlList where id=?', [aclId]);
  return !!(queryResult?.[0]?.isOpen);
}

export async function addRemoveMemberOrSetError(
  {
    memberId,
    aclId,
    isAclMember,
    toBeAdded,
  }: { memberId: string; aclId: string; isAclMember: boolean; toBeAdded: boolean },
  req: NextApiRequest,
  res: NextApiResponse
): Promise<boolean | undefined> {
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  if (!aclId || !memberId || isAclMember === null || toBeAdded === null) {
    res.status(422).send('Missing required fields.');
    return;
  }


  let updateQuery = '';
  let updateParams: string[] = [];

  if (toBeAdded) {
    if (!(await isAclOpen(aclId) || (await isCurrentUserMemberOfAClupdater(aclId,res, req)))) {
      res.status(403).end();
      return;
    }

    if (isAclMember) updateQuery = 'select id from AccessControlList where id=?';
    else updateQuery = 'select userId from userInfo where userId=?';

    const itemsExist = (await executeAndEndSet500OnError(updateQuery, [memberId], res))[0];
    if (itemsExist?.length) {
      res.status(422).send('Invalid input');
      return;
    }
    
    const memberField = isAclMember ? 'memberACLId' : 'memberUserId';
 
    const checkMembershipQuery = `SELECT id FROM ACLMembership WHERE parentACLId=? AND ${memberField}=?`;
    const existingMembership = await executeAndEndSet500OnError(
      checkMembershipQuery,
      [aclId, memberId],
      res
    );

    if (existingMembership && existingMembership.length > 0) 
      {
      res.status(200).end();
      return;
    }
    updateQuery = 'INSERT INTO ACLMembership (parentACLId, memberACLId, memberUserId) VALUES (?, ?, ?)';
    updateParams = isAclMember ? [aclId, memberId, null] : [aclId, null, memberId];
  } else {
    if (memberId != userId && !(await isCurrentUserMemberOfAClupdater(aclId, res, req))) {
      res.status(403).end();
      return;
    }
    const memberField = isAclMember ? 'memberACLId' : 'memberUserId';
    updateQuery = `DELETE FROM ACLMembership WHERE parentACLId=? AND ${memberField} = ?`;
    updateParams = [aclId, memberId];
  }
  const result = await executeAndEndSet500OnError(updateQuery, updateParams, res);
  if (!result) return;
  await recomputeMemberships();
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { memberId, aclId, isAclMember, toBeAdded } = req.body;
  const success = await addRemoveMemberOrSetError(
    { memberId, aclId, isAclMember, toBeAdded },
    req,
    res
  );
  if (!success) return;
  res.status(200).end();
}
