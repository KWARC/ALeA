import bcrypt from 'bcrypt';
import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError, executeDontEndSet500OnError } from './comment-utils';
import { sendEmail } from './email-utils';

export const SALT_ROUNDS = 10;

async function doesUserIdExist(userId: string, res: NextApiResponse) {
  const rows = await executeDontEndSet500OnError<any[]>(
    `SELECT userId FROM userInfo WHERE userId = ?`,
    [userId],
    res
  );
  return !!rows?.length;
}

export async function sendVerificationEmail(
  email: string,
  verificationToken: string,
  origin: string
) {
  const verificationLink = `${origin}/verify?email=${encodeURIComponent(
    email
  )}&id=${verificationToken}`;
  await sendEmail(
    email,
    'Welcome to ALeA! Please Verify Your Email',
    `Thank you for registering with us. Please click on the following link to verify your email: ${verificationLink}`
  );
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email, firstName, lastName, password, verificationToken } = req.body.userDetail;

  if (email.endsWith('@fau.de')) {
    return res.status(400).json({ message: "Can't use this email" });
  }
  if (await doesUserIdExist(email, res)) {
    return res.status(400).send('User already exists');
  }

  // password hashing
  const saltedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await executeAndEndSet500OnError(
    `INSERT INTO userInfo (userId, firstName, lastName, email , saltedPassword, verificationToken, isVerified) VALUES (?, ?,?, ?, ?, ?, ?)`,
    [email, firstName, lastName, email, saltedPassword, verificationToken, false],
    res
  );

  if (!result) return;
  res.status(201).json({ message: 'User created successfully' });

  // Send email with verification link.
  sendVerificationEmail(email, verificationToken, req.headers.origin);
}
