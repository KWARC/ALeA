import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError, persistUserInfoFromJwt } from './comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const persist = await persistUserInfoFromJwt(req, { showSectionReview: req.body.showSectionReview });
  if (!persist) {
    res.status(403).send({ message: "Couldn't get user info" });
    return;
  }

  const updateResult = await executeAndEndSet500OnError(persist.sql, persist.values, res);
  if (!updateResult) return;

  res.status(204).end();
}
