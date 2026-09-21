import { Comment, NotificationType, PointsGrant, lmpResponseToUserInfo } from '@alea/spec';
import { isFauDeEmail, isFauId, isFakeXxxId } from '@alea/utils';
import { randomUUID } from 'node:crypto';
import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import { commentsDb } from './prisma-comments';

function isReadOnlyQuery(query: string): boolean {
  const trimmed = query.trim().toUpperCase();
  return /^(SELECT|SHOW|DESCRIBE|EXPLAIN|CALL\b)/.test(trimmed);
}

export async function executeQuery<T>(query: string, values: any[]) {
  try {
    if (isReadOnlyQuery(query)) {
      const results = await commentsDb.$queryRawUnsafe<T>(query, ...values);
      return results;
    }
    const affectedRows = await commentsDb.$executeRawUnsafe(query, ...values);
    return { affectedRows } as T;
  } catch (error) {
    return { error } as T;
  }
}

export async function executeQueryAndEnd<T>(query: string, values: any[]) {
  try {
    if (isReadOnlyQuery(query)) {
      const results = await commentsDb.$queryRawUnsafe<T>(query, ...values);
      return results;
    }
    const affectedRows = await commentsDb.$executeRawUnsafe(query, ...values);
    return { affectedRows } as T;
  } catch (error) {
    return { error } as T;
  }
}

export async function executeAndEndSet500OnError<T = any>(
  query: string,
  values: any[],
  res
): Promise<T> {
  const results = await executeQueryAndEnd<T>(query, values);
  if (results['error']) {
    res.status(500).send(results);
    console.log(results['error']);
    return undefined;
  }
  return results as T;
}

export async function executeDontEndSet500OnError<T>(
  query: string,
  values: any[],
  res
): Promise<T> {
  const results = await executeQuery<T>(query, values);
  if (results['error']) {
    if (res) res.status(500).send(results);
    console.error(results['error']);
    return undefined;
  }
  return results as T;
}

export async function executeTxnAndEnd(
  query1: string,
  values1: any[],
  query2: string,
  values2: any[],
  query3?: string,
  values3?: any[]
) {
  try {
    const results = await commentsDb.$transaction(async (tx) => {
      const out: unknown[] = [];
      out.push(
        isReadOnlyQuery(query1)
          ? await tx.$queryRawUnsafe(query1, ...values1)
          : await tx.$executeRawUnsafe(query1, ...values1)
      );
      out.push(
        isReadOnlyQuery(query2)
          ? await tx.$queryRawUnsafe(query2, ...values2)
          : await tx.$executeRawUnsafe(query2, ...values2)
      );
      if (query3 && values3) {
        out.push(
          isReadOnlyQuery(query3)
            ? await tx.$queryRawUnsafe(query3, ...values3)
            : await tx.$executeRawUnsafe(query3, ...values3)
        );
      }
      return out;
    });
    return results;
  } catch (error) {
    return { error };
  }
}

export async function executeTxnAndEndSet500OnError(
  res,
  query1: string,
  values1: any[],
  query2: string,
  values2: any[],
  query3?: string,
  values3?: any[]
) {
  const results = await executeTxnAndEnd(query1, values1, query2, values2, query3, values3);
  if (results['error']) {
    res.status(500).send(results);
    return undefined;
  }
  return results;
}

export async function getJwtUserInfo(req: NextApiRequest) {
  const token = req.cookies?.access_token;
  if (!token) return undefined;
  const headers = {
    Authorization: `JWT ${token}`,
  };
  const lmpServerAddress = process.env.NEXT_PUBLIC_AUTH_SERVER_URL;
  const resp = await axios.get(`${lmpServerAddress}/getuserinfo`, { headers });
  return lmpResponseToUserInfo(resp.data);
}

type UserInfoRow = {
  userId: string;
  idmId: string | null;
  email: string | null;
  isVerified: number | boolean | null;
};

export async function findUserInfoRowByJwtUserId(jwtUserId: string): Promise<UserInfoRow | undefined> {
  const rows = await executeQuery<UserInfoRow[]>(
    `SELECT userId, idmId, email, isVerified FROM userInfo WHERE idmId = ? OR userId = ?`,
    [jwtUserId, jwtUserId]
  );
  if (!Array.isArray(rows) || (rows as any).error || rows.length === 0) return undefined;
  return rows.find((r) => r.idmId === jwtUserId) ?? rows[0];
}

/** Canonical app userId: email after IdM rewrite, otherwise JWT / unre-written id. */
export async function getUserInfo(req: NextApiRequest) {
  const jwtInfo = await getJwtUserInfo(req);
  if (!jwtInfo) return undefined;
  const row = await findUserInfoRowByJwtUserId(jwtInfo.userId);
  if (!row) return jwtInfo;
  return { ...jwtInfo, userId: row.userId };
}

export async function getUserId(req: NextApiRequest) {
  return (await getUserInfo(req))?.userId;
}

export function normalizeUserEmail(email: string): string {
  return String(email ?? '')
    .trim()
    .toLowerCase();
}

function idmIdOfUserInfoRow(row: { userId: string; idmId: string | null } | undefined): string {
  if (!row) return '';
  if (row.idmId) return row.idmId;
  if (isFauId(row.userId) || isFakeXxxId(row.userId)) return row.userId;
  return '';
}

function isRealIdmId(idmId: string): boolean {
  return !!idmId && !isFakeXxxId(idmId);
}

async function ensureEmailAvailableOrSetError(
  userId: string,
  email: string,
  res: NextApiResponse
): Promise<boolean> {
  const taken = await executeDontEndSet500OnError<{ userId: string }[]>(
    `SELECT userId FROM userInfo
     WHERE (LOWER(TRIM(email)) = ? OR LOWER(userId) = ?) AND userId <> ?`,
    [email, email, userId],
    res
  );
  if (!taken) return false;
  if (taken.length > 0) {
    res.status(409).json({
      message: 'This email is already used by another account. Contact support to resolve it.',
    });
    return false;
  }
  return true;
}

/**
 * Updates `userInfo.email`. Any actual address change sets `isVerified = 0`.
 * Real IdM users (idmId / FAU-shaped id, not fake_xxx) may only use @fau.de.
 */
export async function setUserInfoEmailOrSetError(params: {
  userId: string;
  email: string;
  res: NextApiResponse;
  verificationToken?: string | null;
}): Promise<{ email: string; verificationToken: string | null; unchanged: boolean } | undefined> {
  const { userId, res } = params;
  const email = normalizeUserEmail(params.email);
  if (!email.includes('@') || !email.includes('.')) {
    res.status(400).json({ message: 'Invalid email address' });
    return undefined;
  }

  const rows = await executeDontEndSet500OnError<
    { userId: string; email: string | null; idmId: string | null; verificationToken: string | null }[]
  >(`SELECT userId, email, idmId, verificationToken FROM userInfo WHERE userId=?`, [userId], res);
  if (!rows) return undefined;
  if (!rows[0]) {
    res.status(404).json({ message: 'User not found' });
    return undefined;
  }

  const token = params.verificationToken ?? randomUUID();
  const current = normalizeUserEmail(rows[0].email ?? '');
  if (current === email) {
    if (rows[0].verificationToken) {
      return { email, verificationToken: rows[0].verificationToken, unchanged: true };
    }
    const tokenUpdated = await executeDontEndSet500OnError(
      `UPDATE userInfo SET verificationToken=? WHERE userId=?`,
      [token, userId],
      res
    );
    if (!tokenUpdated) return undefined;
    return { email, verificationToken: token, unchanged: true };
  }

  if (isRealIdmId(idmIdOfUserInfoRow(rows[0])) && !isFauDeEmail(email)) {
    res.status(400).json({ message: 'Use a FAU email address (@fau.de)' });
    return undefined;
  }
  if (!(await ensureEmailAvailableOrSetError(userId, email, res))) return undefined;

  const updated = await executeDontEndSet500OnError(
    `UPDATE userInfo SET email=?, isVerified=0, verificationToken=? WHERE userId=?`,
    [email, token, userId],
    res
  );
  if (!updated) return undefined;
  return { email, verificationToken: token, unchanged: false };
}

export async function userHasIdmAccount(canonicalUserId: string): Promise<boolean> {
  if (!canonicalUserId) return false;
  const rows = await executeQuery<{ idmId: string | null }[]>(
    `SELECT idmId FROM userInfo WHERE userId = ? LIMIT 1`,
    [canonicalUserId]
  );
  if (!Array.isArray(rows) || (rows as any).error) return isFauId(canonicalUserId);
  if (rows[0]?.idmId) return true;
  return isFauId(canonicalUserId);
}

export async function persistUserInfoFromJwt(
  req: NextApiRequest,
  extra: Record<string, unknown> = {}
) {
  const jwtInfo = await getJwtUserInfo(req);
  if (!jwtInfo) return undefined;
  const extraCols = Object.keys(extra);
  const extraVals = Object.values(extra);
  const row = await findUserInfoRowByJwtUserId(jwtInfo.userId);
  if (row) {
    const setExtra = extraCols.map((c) => `${c}=?`).join(', ');
    const sql = setExtra
      ? `UPDATE userInfo SET firstName=?, lastName=?, ${setExtra} WHERE userId=?`
      : `UPDATE userInfo SET firstName=?, lastName=? WHERE userId=?`;
    return {
      jwtInfo,
      sql,
      values: [jwtInfo.givenName, jwtInfo.sn, ...extraVals, row.userId],
    };
  }
  const idmId = jwtInfo.userId.includes('@') ? null : jwtInfo.userId;
  const cols = ['userId', 'firstName', 'lastName', 'idmId', ...extraCols];
  const sql = `INSERT INTO userInfo (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
  return {
    jwtInfo,
    sql,
    values: [jwtInfo.userId, jwtInfo.givenName, jwtInfo.sn, idmId, ...extraVals],
  };
}

export async function getUserIdOrSetError(req, res) {
  const userId = await getUserId(req);
  if (!userId) res.status(403).send({ message: 'Could not get userId' });
  return userId;
}

export async function getExistingCommentDontEnd(
  commentId: number
): Promise<{ existing: Comment; error?: number }> {
  const existingComments = await executeQuery(
    'SELECT * FROM comments WHERE commentId = ? AND (isDeleted IS NULL OR isDeleted !=1)',
    [commentId]
  );
  if (existingComments['error']) {
    console.error(existingComments['error']);
    return { existing: undefined, error: 500 };
  }

  if (existingComments['length'] !== 1) {
    return { existing: undefined, error: 404 };
  }
  return { existing: existingComments[0], error: undefined };
}

export async function getExistingPointsDontEnd(
  commentId: number
): Promise<{ existing: PointsGrant; error?: number }> {
  const existingGrant = await executeQuery('SELECT * FROM points WHERE commentId = ?', [commentId]);
  if (existingGrant['error']) {
    console.error(existingGrant['error']);
    return { existing: undefined, error: 500 };
  }

  if (existingGrant['length'] !== 1) {
    return { existing: undefined, error: 404 };
  }
  return { existing: existingGrant[0], error: undefined };
}
export function checkIfPostOrSetError(req, res) {
  return checkIfTypeOrSetError(req, res, 'POST');
}
export function checkIfGetOrSetError(req, res) {
  return checkIfTypeOrSetError(req, res, 'GET');
}
export function checkIfDeleteOrSetError(req, res) {
  return checkIfTypeOrSetError(req, res, 'DELETE');
}

function checkIfTypeOrSetError(req, res, type: 'POST' | 'DELETE' | 'GET') {
  if (req.method !== type) {
    res.status(405).send({ message: `Only ${type} requests allowed` });
    return false;
  }
  return true;
}

export async function sendNotification(
  userId: string,
  header: string,
  content: string,
  header_de: string,
  content_de: string,
  notificationType: NotificationType,
  link: string
): Promise<void> {
  const postNotification = await executeQuery(
    `INSERT INTO notifications (userId, header, content, header_de, content_de, notificationType, link) VALUES (?,?,?,?,?,?,?)`,
    [userId, header, content, header_de, content_de, notificationType, link]
  );
  if (postNotification['error']) {
    console.error(postNotification['error']);
  }
}

export function checkIfQueryParameterExistOrSetError(
  req: NextApiRequest,
  res: NextApiResponse,
  querys: string | string[]
): boolean {
  if (typeof querys === 'string') querys = [querys];
  for (const query of querys) {
    if (req.query[query]) continue;
    res.status(422).end();
    return false;
  }
  return true;
}
