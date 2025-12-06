import { NextApiRequest, NextApiResponse } from 'next';
import { executeDontEndSet500OnError } from '../comment-utils';
import { isFauId } from '@alea/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.body;
  if (!userId) return;
  const tableToCheck = isFauId(userId) ? 'studentProfile' : 'recruiterProfile';
  const query = `SELECT userId FROM ${tableToCheck} WHERE userId = ?`;
  const results: any[] = await executeDontEndSet500OnError(query, [userId], res);
  if (!results) return;
  res.status(200).json({ exists: !!results.length });
}
