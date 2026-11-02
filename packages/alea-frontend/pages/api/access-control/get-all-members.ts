import { NextApiRequest, NextApiResponse } from 'next';
import { getCacheKey, requireCurrentUserIsAclUpdater } from '../acl-utils/acl-common-utils';
import { checkIfGetOrSetError, executeDontEndSet500OnError } from '../comment-utils';
import { CACHE_STORE } from '../acl-utils/cache-store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const aclId = req.query.id as string;
  if (!aclId) return res.status(422).send(`Missing param id.`);
  if (!(await requireCurrentUserIsAclUpdater(aclId, req, res))) return;
  const members = await CACHE_STORE.getFromSet(getCacheKey(aclId));

  if (!members || members.length === 0) {
    return res.status(200).send([]);
  }

  const placeholders = members.map(() => '?').join(',');
  const result: { firstName: string; lastName: string; userId: string }[] =
    await executeDontEndSet500OnError(
      `select firstName, lastName, userId from userInfo where userId IN (${placeholders})`,
      members,
      res
    );
  res
    .status(200)
    .send(result.map((c) => ({ fullName: `${c.firstName} ${c.lastName}`, userId: c.userId })));
}
