import { isCdiAuthEnabled } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError, executeQuery } from './comment-utils';
import { commentsDb } from './prisma-comments';

type StagingRow = {
  cdiId: string;
  firstName: string | null;
  lastName: string | null;
};

async function loadCdiStaging(
  email: string,
  verificationToken: string
): Promise<StagingRow | undefined> {
  const rows = await executeQuery<
    { cdiId: string; firstName: string | null; lastName: string | null }[]
  >(
    `SELECT cdiId, firstName, lastName FROM unverifiedUsers
     WHERE LOWER(TRIM(emailAddress)) = ? AND verificationToken = ?`,
    [email, verificationToken]
  );
  if (!Array.isArray(rows) || rows.length !== 1) return undefined;
  return rows[0];
}

async function bindCdiToExistingUser(
  tx: { $executeRawUnsafe: (...args: unknown[]) => Promise<unknown> },
  pending: StagingRow,
  existing: { userId: string; cdiId: string | null }
) {
  if (existing.cdiId && existing.cdiId !== pending.cdiId) {
    throw new Error('CDI_BOUND');
  }
  await tx.$executeRawUnsafe(
    `UPDATE userInfo SET cdiId=?, isVerified=1, verificationToken=NULL WHERE userId=?`,
    pending.cdiId,
    existing.userId
  );
}

async function insertCdiUser(
  tx: { $executeRawUnsafe: (...args: unknown[]) => Promise<unknown> },
  email: string,
  pending: StagingRow
) {
  const firstName = (pending.firstName ?? '').trim();
  const lastName = (pending.lastName ?? '').trim();
  if (!firstName || !lastName) throw new Error('NAMES_REQUIRED');
  await tx.$executeRawUnsafe(
    `INSERT INTO userInfo (userId, firstName, lastName, email, cdiId, isVerified) VALUES (?, ?, ?, ?, ?, 1)`,
    email,
    firstName,
    lastName,
    email,
    pending.cdiId
  );
}

async function promoteCdiStaging(email: string, pending: StagingRow) {
  await commentsDb.$transaction(async (tx) => {
    const existing = await tx.$queryRawUnsafe<{ userId: string; cdiId: string | null }[]>(
      `SELECT userId, cdiId FROM userInfo WHERE LOWER(TRIM(email)) = ? OR LOWER(userId) = ? LIMIT 1`,
      email,
      email
    );
    if (existing[0]) {
      await bindCdiToExistingUser(tx, pending, existing[0]);
    } else {
      await insertCdiUser(tx, email, pending);
    }
    await tx.$executeRawUnsafe(`DELETE FROM unverifiedUsers WHERE cdiId=?`, pending.cdiId);
  });
}

function sendPromoteFailure(res: NextApiResponse, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('NAMES_REQUIRED')) {
    return res.status(400).json({ message: 'First and last name are required for a new account' });
  }
  if (msg.includes('CDI_BOUND') || msg.includes('P2002') || msg.includes('Duplicate')) {
    return res.status(409).json({
      message: 'This Cdi id is already bound to another account. Contact support to resolve it.',
    });
  }
  console.error(err);
  return res.status(500).json({ message: 'Failed to verify email' });
}

async function verifyUserInfoEmail(
  res: NextApiResponse,
  email: string,
  verificationToken: string
) {
  const existingUser = (await executeAndEndSet500OnError(
    `SELECT userId FROM userInfo WHERE LOWER(TRIM(email)) = ? AND verificationToken = ?`,
    [email, verificationToken],
    res
  )) as { userId: string }[] | undefined;
  if (!existingUser) return;
  if (existingUser.length !== 1) {
    return res.status(400).json({ message: 'Invalid userId or verification token' });
  }
  await executeAndEndSet500OnError(
    `UPDATE userInfo SET isVerified=1 WHERE userId=? AND verificationToken=?`,
    [existingUser[0].userId, verificationToken],
    res
  );
  return res.status(200).json({ message: 'Email Verified Successfully.' });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email, verificationToken } = req.body;
  if (!email || !verificationToken) {
    return res.status(400).json({ message: 'Invalid userId or verification token' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();

  if (isCdiAuthEnabled()) {
    const pending = await loadCdiStaging(normalizedEmail, verificationToken);
    if (pending) {
      try {
        await promoteCdiStaging(normalizedEmail, pending);
        return res.status(200).json({ message: 'Email Verified Successfully.' });
      } catch (err) {
        return sendPromoteFailure(res, err);
      }
    }
  }

  return verifyUserInfoEmail(res, normalizedEmail, verificationToken);
}
