import { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'node:crypto';
import { isFauId, isFakeXxxId, isFauDeEmail } from '@alea/utils';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeDontEndSet500OnError,
  getUserIdOrSetError,
  persistUserInfoFromJwt,
} from './comment-utils';
import { sendVerificationEmail } from './signup';

function isPlausibleEmail(email: string) {
  return email.includes('@') && email.includes('.');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase();
  if (!isPlausibleEmail(email)) {
    return res.status(400).json({ message: 'Invalid email address' });
  }
  const persist = await persistUserInfoFromJwt(req);
  if (persist) {
    const persisted = await executeDontEndSet500OnError(persist.sql, persist.values, res);
    if (!persisted) return;
  }

  const selfRows = await executeDontEndSet500OnError<{ idmId: string | null }[]>(
    `SELECT idmId FROM userInfo WHERE userId=?`,
    [userId],
    res
  );
  if (!selfRows) return;
  const idmId = selfRows[0]?.idmId || (isFauId(userId) || isFakeXxxId(userId) ? userId : '');
  if (!idmId) {
    return res.status(403).json({ message: 'Only IdM users can set email here' });
  }
  if (!isFakeXxxId(idmId) && !isFauDeEmail(email)) {
    return res.status(400).json({ message: 'Use a FAU email address (@fau.de)' });
  }

  const taken = await executeDontEndSet500OnError<{ userId: string }[]>(
    `SELECT userId FROM userInfo
     WHERE (LOWER(TRIM(email)) = ? OR LOWER(userId) = ?) AND userId <> ?`,
    [email, email, userId],
    res
  );
  if (!taken) return;
  if (taken.length > 0) {
    return res.status(409).json({
      message: 'This email is already used by another account. Contact support to resolve it.',
    });
  }

  const verificationToken = randomUUID();
  const updated = await executeAndEndSet500OnError(
    `UPDATE userInfo SET email=?, verificationToken=?, isVerified=0 WHERE userId=?`,
    [email, verificationToken, userId],
    res
  );
  if (!updated) return;

  const host = req.headers.host || 'localhost:4200';
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const origin = String(req.headers.origin || `${proto}://${host}`).replace(/\/$/, '');
  try {
    await sendVerificationEmail(email, verificationToken, origin);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Saved email but failed to send mail' });
  }
  res.status(200).json({ message: 'Verification email sent' });
}
