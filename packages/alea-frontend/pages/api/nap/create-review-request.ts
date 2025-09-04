import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { CreateReviewRequest } from '@stex-react/spec';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const { reviewType, answerId } = req.body as CreateReviewRequest;
  if (!reviewType || !answerId) return res.status(422).end();

  await executeAndEndSet500OnError(
    `INSERT INTO ReviewRequest (reviewType, answerId, userId) VALUES (?,?,?)`,
    [reviewType, answerId, userId],
    res
  );
  res.status(201).end();
}
