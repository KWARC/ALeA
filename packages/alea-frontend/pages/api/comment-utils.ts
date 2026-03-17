import { Comment, NotificationType, PointsGrant, lmpResponseToUserInfo } from '@alea/spec';
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

export async function getUserInfo(req: NextApiRequest) {
  const token = req.cookies?.access_token;
  if (!token) return undefined;
  const headers = {
    Authorization: `JWT ${token}`,
  };
  const lmpServerAddress = process.env.NEXT_PUBLIC_AUTH_SERVER_URL;
  const resp = await axios.get(`${lmpServerAddress}/getuserinfo`, { headers });
  return lmpResponseToUserInfo(resp.data);
}

export async function getUserId(req: NextApiRequest) {
  return (await getUserInfo(req))?.userId;
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
