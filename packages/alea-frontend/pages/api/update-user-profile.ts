import { NextApiRequest, NextApiResponse } from 'next';
import {
  executeDontEndSet500OnError,
  getUserIdOrSetError,
  setUserInfoEmailOrSetError,
} from './comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const { firstName, lastName, email, studyProgram, semester, languages } = req.body;

  if (!firstName && !lastName && !email && !studyProgram && !semester && !languages) {
    return res.status(400).json({ error: 'At least one field must be provided' });
  }

  const result = await executeDontEndSet500OnError(
    `UPDATE userInfo SET firstName = ?, lastName = ?, studyProgram = ?, semester = ?, languages = ? WHERE userId = ?`,
    [firstName, lastName, studyProgram ?? null, semester ?? null, languages ?? null, userId],
    res
  );
  if (!result) return;

  if (email != null && String(email).trim() !== '') {
    const saved = await setUserInfoEmailOrSetError({ userId, email: String(email), res });
    if (!saved) return;
  }

  res.status(200).json({ message: 'User profile updated successfully' });
}
