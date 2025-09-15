import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError, getUserIdOrSetError } from './comment-utils';
import { UserProfile } from '@alea/spec';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const query = `SELECT firstName, lastName, email, studyProgram, semester, languages FROM userInfo WHERE userId = ?`;
  const result = await executeAndEndSet500OnError(query, [userId], res);
  if (!result || result.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { firstName, lastName, email, studyProgram, semester, languages } = result[0];

  return res.status(200).json({
    firstName,
    lastName,
    email,
    studyProgram,
    semester,
    languages,
  } as UserProfile
);
}
