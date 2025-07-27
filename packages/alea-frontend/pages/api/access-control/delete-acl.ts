import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeTxnAndEndSet500OnError,
} from '../comment-utils';
import { isCurrentUserMemberOfAClupdater } from '../acl-utils/acl-common-utils';

export async function checkResourcesassociatedOrSet500OnError(
  aclId: string,
  res
): Promise<boolean> {
  const resourceId = await executeAndEndSet500OnError(
    'select resourceId from resourceaccess where aclId=?',
    [aclId],
    res
  );

  if (resourceId?.length) return true;
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const id = req.body.id as string;
  console.log("id",id);
  if (!id || typeof id !== 'string') return res.status(422).send('Missing id.');
  if (!(await isCurrentUserMemberOfAClupdater(id, res, req))) return res.status(403).end();

if (await checkResourcesassociatedOrSet500OnError(id, res)) return ;

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
