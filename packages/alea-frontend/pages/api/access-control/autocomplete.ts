import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).send('Method not allowed. Use GET.');

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
