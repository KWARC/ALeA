import { AccessControlList } from '@stex-react/api';
import { NextApiRequest, NextApiResponse } from 'next';
import { isCurrentUserMemberOfAClupdater } from '../acl-utils/acl-common-utils';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { recomputeMemberships } from './recompute-memberships';

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

  const acl: AccessControlList = (
    await executeAndEndSet500OnError(
      'select isOpen from AccessControlList where id=?',
      [aclId],
      res
    )
  )?.[0];

  let query = '';
  let params: string[] = [];

  if (toBeAdded) {
    if (!(acl?.isOpen || (await isCurrentUserMemberOfAClupdater(aclId, res, req)))) {
      res.status(403).end();
      return;
    }

    if (isAclMember) query = 'select id from AccessControlList where id=?';
    else query = 'select userId from userInfo where userId=?';

    const itemsExist = (await executeAndEndSet500OnError(query, [memberId], res))[0];
    if (itemsExist?.length) {
      res.status(422).send('Invalid input');
      return;
    }
    query = 'INSERT INTO ACLMembership (parentACLId, memberACLId, memberUserId) VALUES (?, ?, ?)';
    params = isAclMember ? [aclId, memberId, null] : [aclId, null, memberId];
  } else {
    if (!(await isCurrentUserMemberOfAClupdater(aclId, res, req)) && memberId != userId) {
      res.status(403).end();
      return;
    }
    const memberField = isAclMember ? 'memberACLId' : 'memberUserId';
    query = `DELETE FROM ACLMembership WHERE parentACLId=? AND ${memberField} = ?`;
    params = [aclId, memberId];
  }
  const result = await executeAndEndSet500OnError(query, params, res);
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
