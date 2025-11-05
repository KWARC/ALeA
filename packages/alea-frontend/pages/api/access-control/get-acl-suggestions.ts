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

    const acls = await executeAndEndSet500OnError(
      `SELECT id, description FROM AccessControlList WHERE id LIKE ? ORDER BY id ASC LIMIT 10`,
      [`%${q}%`],
      res
    );

    res.status(200).json(acls);
  } catch (error) {
    console.error('Error fetching autocomplete ACLs:', error);
    res.status(500).send('Internal server error.');
  }
}
