import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError } from './comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email, verificationToken } = req.body;
  if (!email || !verificationToken) {
    return res.status(400).json({ message: 'Invalid userId or verification token' });
  }
  const existingUser = (await executeAndEndSet500OnError(
    `SELECT userId FROM userInfo WHERE LOWER(TRIM(email)) = ? AND verificationToken = ?`,
    [String(email).trim().toLowerCase(), verificationToken],
    res
  )) as { userId: string }[] | undefined;

  if (!existingUser) return;
  if (existingUser.length === 1) {
    await executeAndEndSet500OnError(
      `UPDATE userInfo SET isVerified=1 WHERE userId=? AND verificationToken=?`,
      [existingUser[0].userId, verificationToken],
      res
    );
    res.status(200).json({ message: 'Email Verified Successfully.' });
  } else {
    res.status(400).json({ message: 'Invalid userId or verification token' });
  }
}
