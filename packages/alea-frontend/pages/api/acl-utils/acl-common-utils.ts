import { AccessControlList } from '@stex-react/api';
import { NextApiResponse } from 'next';
import { executeAndEndSet500OnError, getUserIdOrSetError } from '../comment-utils';
import { CACHE_STORE } from './cache-store';

export async function checkResourcesassociatedOrSet500OnError(
  aclId: string,
  res: any 
): Promise<boolean> {
  const resourceId = await executeAndEndSet500OnError(
    'select resourceId from resourceaccess where aclId=?',
    [aclId],
    res
  );

  if (resourceId?.length) return true;
  return false;
}
export function getCacheKey(aclId: string) {
  return `acl-membership:${aclId}`;
}
export async function isMemberOfAcl(acl: string, userId: string) {
  return await CACHE_STORE.isMemberOfSet(getCacheKey(acl), userId);
}
export async function isCurrentUserMemberOfAClupdater(aclId: string, res, req): Promise<boolean> {
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return false;
  const acl: AccessControlList = (
    await executeAndEndSet500OnError(
      'select updaterACLId from AccessControlList where id=?',
      [aclId],
      res
    )
  )[0];
  return await isMemberOfAcl(acl.updaterACLId, userId);
}

export async function validateMemberAndAclIds(res: NextApiResponse, memberUserIds, memberACLIds) {
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

  const aclCount = memberACLIds.length
    ? (
        await executeAndEndSet500OnError<[]>(
          'select id from AccessControlList where id in (?)',
          [memberACLIds],
          res
        )
      ).length
    : 0;
  if (aclCount !== memberACLIds.length) return false;
  return true;
}

export async function getAclMembers(aclId: string) {
  return CACHE_STORE.getFromSet(getCacheKey(aclId));
}
