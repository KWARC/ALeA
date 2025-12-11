import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { canUpdateAccessControlEntries } from './resource-utils';
import { recomputeMemberships } from './recompute-memberships';

export async function unsafeCreateResourceAccessUnlessForced(
  resourceId: string,
  actionId: string,
  aclId: string,
  res: NextApiResponse
): Promise<any> {
  const existingQuery = `SELECT resourceId, actionId, aclId FROM ResourceAccess WHERE resourceId = ? AND actionId = ? AND aclId = ?`;
  const isExists: [{ resourceId: string; actionId: string; aclId: string }] =
    await executeAndEndSet500OnError(existingQuery, [resourceId, actionId, aclId], res);
  if (isExists.length > 0) {
    return res.status(409).send('already exists');
  }
  const resourceQuery = `INSERT INTO ResourceAccess (aclId, resourceId, actionId) VALUES (?, ?, ?)`;
  const result = await executeAndEndSet500OnError(
    resourceQuery,
    [aclId, resourceId, actionId],
    res
  );
  if (!result) return;
  await recomputeMemberships();
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  const { aclId, resourceId, actionId } = req.body;
  if (!aclId || !resourceId || !actionId) return res.status(422).send('Missing required fields');

  if (!(await canUpdateAccessControlEntries(res, resourceId, userId)))
    return res.status(403).send('unauthorized');

  const result = await unsafeCreateResourceAccessUnlessForced(resourceId, actionId, aclId, res);
  if (!result) return;
  res.status(200).send('created');
}
