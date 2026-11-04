import { NextApiRequest, NextApiResponse } from 'next';
import { requireCurrentUserIsSysAdmin } from '../acl-utils/acl-common-utils';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!checkIfGetOrSetError(req, res)) return;
    if (!(await requireCurrentUserIsSysAdmin(req, res))) return;
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(422).send("Missing or invalid query parameter 'q'.");
    }
    const users = await executeAndEndSet500OnError(
      `
      SELECT 
        userId,
        CONCAT(firstName, ' ', lastName) AS fullName
      FROM userInfo
      WHERE CONCAT(firstName, ' ', lastName) LIKE ?
      ORDER BY firstName ASC
      LIMIT 10
      `,
      [`%${q}%`],
      res
    );

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching autocomplete users:', error);
    res.status(500).send('Internal server error.');
  }
}
