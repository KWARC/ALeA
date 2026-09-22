import { isCdiAuthEnabled, isFauDeEmail } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'node:crypto';
import {
  checkIfPostOrSetError,
  executeDontEndSet500OnError,
  findUserInfoRowForLms,
  getJwtUserInfo,
  getUserIdOrSetError,
  persistUserInfoFromJwt,
  setUserInfoEmailOrSetError,
  userHasIdmAccount,
} from './comment-utils';
import { sendVerificationEmail } from './signup';

async function sendMailOr500(
  req: NextApiRequest,
  res: NextApiResponse,
  email: string,
  token: string
) {
  const host = req.headers.host || 'localhost:4200';
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const origin = String(req.headers.origin || `${proto}://${host}`).replace(/\/$/, '');
  try {
    await sendVerificationEmail(email, token, origin);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Saved email but failed to send mail' });
  }
  res.status(200).json({ message: 'Verification email sent' });
}

async function handleCdiStaging(
  req: NextApiRequest,
  res: NextApiResponse,
  cdiId: string
): Promise<void> {
  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase();
  const firstName = String(req.body?.firstName ?? '').trim();
  const lastName = String(req.body?.lastName ?? '').trim();
  if (!email.includes('@') || !email.includes('.')) {
    res.status(400).json({ message: 'Invalid email address' });
    return;
  }
  if (!isFauDeEmail(email)) {
    res.status(400).json({ message: 'Use a FAU email address (@fau.de)' });
    return;
  }

  const otherPending = await executeDontEndSet500OnError<{ cdiId: string }[]>(
    `SELECT cdiId FROM unverifiedUsers WHERE LOWER(TRIM(emailAddress)) = ? AND cdiId <> ?`,
    [email, cdiId],
    res
  );
  if (!otherPending) return;
  if (otherPending.length > 0) {
    res.status(409).json({
      message: 'This email is already used by another account. Contact support to resolve it.',
    });
    return;
  }

  const existing = await executeDontEndSet500OnError<
    { userId: string; firstName: string | null; lastName: string | null }[]
  >(
    `SELECT userId, firstName, lastName FROM userInfo WHERE LOWER(TRIM(email)) = ? OR LOWER(userId) = ? LIMIT 1`,
    [email, email],
    res
  );
  if (!existing) return;
  const existingRow = existing[0];
  if (!existingRow && (!firstName || !lastName)) {
    res.status(400).json({ message: 'First and last name are required for a new account' });
    return;
  }

  const token = randomUUID();
  const saved = await executeDontEndSet500OnError(
    `INSERT INTO unverifiedUsers (cdiId, emailAddress, verificationToken, firstName, lastName)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       emailAddress = VALUES(emailAddress),
       verificationToken = VALUES(verificationToken),
       firstName = VALUES(firstName),
       lastName = VALUES(lastName)`,
    [
      cdiId,
      email,
      token,
      firstName || existingRow?.firstName || null,
      lastName || existingRow?.lastName || null,
    ],
    res
  );
  if (!saved) return;
  await sendMailOr500(req, res, email, token);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  if (isCdiAuthEnabled()) {
    const jwtInfo = await getJwtUserInfo(req);
    if (!jwtInfo?.authKind) return res.status(403).json({ message: 'Could not get userId' });

    if (jwtInfo.authKind === 'email')
      return res.status(403).json({ message: 'Only uni email here' });

    const row = await findUserInfoRowForLms(jwtInfo);
    let existingUserId: string | undefined;
    if (jwtInfo.authKind === 'fake') {
      if (!row) return res.status(404).json({ message: 'User not found' });
      existingUserId = row.userId;
    } else if (row?.cdiId && row.cdiId === jwtInfo.cdiId) {
      existingUserId = row.userId;
    }
    if (existingUserId) {
      const saved = await setUserInfoEmailOrSetError({
        userId: existingUserId,
        email: String(req.body?.email ?? ''),
        res,
      });
      if (!saved) return;
      if (!saved.verificationToken) {
        return res.status(500).json({ message: 'Missing verification token' });
      }
      return sendMailOr500(req, res, saved.email, saved.verificationToken);
    }
    if (!jwtInfo.cdiId) return res.status(403).json({ message: 'Could not get userId' });
    return handleCdiStaging(req, res, jwtInfo.cdiId);
  }

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
  await sendMailOr500(req, res, saved.email, saved.verificationToken);
}
