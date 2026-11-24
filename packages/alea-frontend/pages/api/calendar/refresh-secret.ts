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

    const calendarSecret = randomUUID();
    const updated = await executeQuery<{ affectedRows: number }>(
      'UPDATE userInfo SET calendarSecret = ? WHERE userId = ?',
      [calendarSecret, userId]
    );
    if ('error' in updated) throw updated.error;
    if (!updated.affectedRows) return res.status(404).send('Account not found');
    return res.status(200).json({ calendarSecret });
  } catch {
    console.error('Could not refresh personal calendar code');
    return res.status(500).send('Could not refresh personal calendar code');
  }
}
