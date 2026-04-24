import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  //TODO:Need ACL. Only owner can remove it.
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const { id, institutionId } = req.body;
  if (!institutionId) return res.status(422).end('Missing institutionId');
  await executeAndEndSet500OnError(`Delete From Answer Where userId=? and id=? and institutionId=?`, [userId, id, institutionId], res);
  res.status(200).end();
}
