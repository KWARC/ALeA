import { AccessControlList } from '@stex-react/api';
import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError, executeQuery, getUserId } from '../comment-utils';
import { CACHE_STORE } from './cache-store';

export function getCacheKey(aclId: string) {
  return `acl-membership:${aclId}`;
}

export async function isMemberOfAcl(acl: string, userId: string) {
  return await CACHE_STORE.isMemberOfSet(getCacheKey(acl), userId);
}

export async function isCurrentUserMemberOfAClupdater(
  aclId: string,
  req: NextApiRequest
): Promise<boolean> {
  const userId = await getUserId(req);
  if (!userId) return false;
  const queryResult = (
    await executeQuery('select updaterACLId from AccessControlList where id=?', [aclId])
  )?.[0];
  if (!queryResult?.updaterACLId) return false;
  return await isMemberOfAcl(queryResult.updaterACLId, userId);
}

export async function areMemberUsersAndAclIdsValid(
  memberUserIds: string[],
  memberACLIds: string[]
) {
  /* Disable memberUserIds check for now. We may not have their info in the database.
  const memberCount = memberUserIds.length
    ? (
        await executeAndEndSet500OnError<[]>(
          'select userId from userInfo where userId in (?)',
          [memberUserIds],
          res
        )
      ).length
    : 0;
  if (memberCount !== memberUserIds.length) return false;*/

  if (!memberACLIds?.length) return true;
  const results = await executeQuery<[]>('select id from AccessControlList where id in (?)', [
    memberACLIds,
  ]);
  if (!results || 'error' in results) return false;
  return results.length === memberACLIds.length;
}

export async function getAclMembers(aclId: string) {
  return CACHE_STORE.getFromSet(getCacheKey(aclId));
}
