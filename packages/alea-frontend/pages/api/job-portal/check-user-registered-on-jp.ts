import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeDontEndSet500OnError, getUserIdOrSetError } from '../comment-utils';
import { isFauId } from '@alea/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if(!checkIfGetOrSetError(req,res))return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const tableToCheck = isFauId(userId) ? 'studentProfile' : 'recruiterProfile';
  const query = `SELECT userId FROM ${tableToCheck} WHERE userId = ?`;
  const results: any[] = await executeDontEndSet500OnError(query, [userId], res);
  if (!results) return;
  res.status(200).json({ exists: !!results.length });
}
