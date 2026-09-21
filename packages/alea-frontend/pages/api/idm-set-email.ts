import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeDontEndSet500OnError,
  getUserIdOrSetError,
  persistUserInfoFromJwt,
  setUserInfoEmailOrSetError,
  userHasIdmAccount,
} from './comment-utils';
import { sendVerificationEmail } from './signup';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const persist = await persistUserInfoFromJwt(req);
  if (persist) {
    const persisted = await executeDontEndSet500OnError(persist.sql, persist.values, res);
    if (!persisted) return;
  }

  if (!(await userHasIdmAccount(userId))) {
    return res.status(403).json({ message: 'Only IdM users can set email here' });
  }

  const saved = await setUserInfoEmailOrSetError({
    userId,
    email: String(req.body?.email ?? ''),
    res,
  });
  if (!saved) return;
  if (!saved.verificationToken) {
    return res.status(500).json({ message: 'Missing verification token' });
  }

  const host = req.headers.host || 'localhost:4200';
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const origin = String(req.headers.origin || `${proto}://${host}`).replace(/\/$/, '');
  try {
    await sendVerificationEmail(saved.email, saved.verificationToken, origin);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Saved email but failed to send mail' });
  }
  res.status(200).json({ message: 'Verification email sent' });
}
