import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!checkIfGetOrSetError(req, res)) return;
    const userId = await getUserIdOrSetError(req, res);
    if (!userId) return;
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(422).send("Missing or invalid query parameter 'q'.");
    }
    const users = await executeAndEndSet500OnError(
      `SELECT userId, FirstName FROM userInfo WHERE FirstName LIKE ? ORDER BY FirstName ASC LIMIT 10`,
      [`%${q}%`],
      res
    );

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching autocomplete users:', error);
    res.status(500).send('Internal server error.');
  }
}
