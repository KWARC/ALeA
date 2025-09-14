import { ANON_USER_ID_PREFIX } from '@alea/spec';
import bcrypt from 'bcrypt';
import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError } from '../comment-utils';
import { SALT_ROUNDS } from '../signup';
import { doesUserIdExist } from '../userid-exists';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, firstName, lastName, password } = req.body;

  if (!userId.startsWith(ANON_USER_ID_PREFIX)) return res.status(400).send('Invalid user ID');

  if (await doesUserIdExist(userId, res)) return res.status(400).send('User already exists');

  const saltedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await executeAndEndSet500OnError(
    `INSERT INTO userInfo (userId,firstName,lastName, saltedPassword) VALUES (?, ? ,? ,?)`,
    [userId, firstName, lastName, saltedPassword],
    res
  );
  if (!result) return;
  res.status(200).json({ message: 'Avatar created successfully' });
}
