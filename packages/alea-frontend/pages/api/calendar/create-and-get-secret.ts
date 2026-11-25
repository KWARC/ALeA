import type { CalendarSecretResponse } from '@alea/spec';
import { randomUUID } from 'node:crypto';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeQuery, getUserIdOrSetError } from '../comment-utils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CalendarSecretResponse | string>
) {
  res.setHeader('Cache-Control', 'no-store');
  if (!checkIfPostOrSetError(req, res)) return;

  try {
    const userId = await getUserIdOrSetError(req, res);
    if (!userId) return;

    const updated = await executeQuery<{ affectedRows: number }>(
      'UPDATE userInfo SET calendarSecret = ? WHERE userId = ? AND calendarSecret IS NULL',
      [randomUUID(), userId]
    );
    if ('error' in updated) throw updated.error;

    const rows = await executeQuery<{ calendarSecret: string | null }[]>(
      'SELECT calendarSecret FROM userInfo WHERE userId = ?',
      [userId]
    );
    if ('error' in rows) throw rows.error;
    if (!rows[0]?.calendarSecret) return res.status(404).send('Calendar code not found');
    return res.status(200).json({ calendarSecret: rows[0].calendarSecret });
  } catch {
    console.error('Could not get personal calendar code');
    return res.status(500).send('Could not get personal calendar code');
  }
}
