import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeDontEndSet500OnError,
} from '../comment-utils';
import { RecruiterData } from '@stex-react/api';

async function getRecruiterProfileByUserIdOrSet500OnError(userId: string, res: NextApiResponse) {
  const results: RecruiterData[] = await executeDontEndSet500OnError(
    `SELECT name,userId,email,position,mobile,altMobile,organizationId,socialLinks,about
     FROM recruiterProfile 
     WHERE userId = ? 
     `,
    [userId],
    res
  );
  if (!results) return;
  if (!results.length) res.status(404).end();
  return results[0];
}
//risky , donot use unless necessary.
export async function deleteRecruiterProfileOrSetError(userId: string, res: NextApiResponse) {
  if (!userId) return res.status(422).send('Recruiter userId is missing');
  const recruiter = await getRecruiterProfileByUserIdOrSet500OnError(userId, res);
  if (!recruiter) return;
  const result = await executeAndEndSet500OnError(
    'DELETE FROM recruiterProfile WHERE userId = ?',
    [userId],
    res
  );
  if (!result) return;
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { userId } = req.body;
  const result = await deleteRecruiterProfileOrSetError(userId, res);
  if (!result) return;
  res.status(200).end();
}
