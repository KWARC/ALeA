import { NextApiRequest, NextApiResponse } from 'next';
import { isMemberOfAcl, requireCurrentUserIsAclUpdater } from '../acl-utils/acl-common-utils';
import { checkIfGetOrSetError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const { id, userId } = req.query;
  if (!id || !userId) return res.status(422).send(`Missing param(s).`);
  if (!(await requireCurrentUserIsAclUpdater(id as string, req, res))) return;
  res.send(await isMemberOfAcl(id as string, userId as string));
}