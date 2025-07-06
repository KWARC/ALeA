import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeTxnAndEndSet500OnError } from '../comment-utils';
import { isCurrentUserMemberOfAClupdater } from '../acl-utils/acl-common-utils';

export async function deleteAclOrSetError(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!id || typeof id !== 'string') {
    res.status(422).send('Missing id.');
    return;
  }
  if (!(await isCurrentUserMemberOfAClupdater(id, req))) {
    res.status(403).end();
    return;
  }
  const result = await executeTxnAndEndSet500OnError(
    res,
    'DELETE FROM AccessControlList WHERE id=?',
    [id],
    'DELETE FROM ACLMembership WHERE parentACLId=?',
    [id]
  );
  if (!result) return;
  return true;
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const id = req.body.id as string;
  const result = await deleteAclOrSetError(id, req, res);
  if (!result) return;
  res.status(200).end();
}
