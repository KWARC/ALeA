import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError, persistUserInfoFromJwt } from './comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const persist = await persistUserInfoFromJwt(req);
  if (!persist) return res.status(204).end();

  const updateResult = await executeAndEndSet500OnError(persist.sql, persist.values, res);
  if (!updateResult) return;

  res.status(204).end();
}
