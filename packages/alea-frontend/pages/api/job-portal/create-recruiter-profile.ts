import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import {  isFauId } from '@alea/utils';

export async function createRecruiterProfileOrSet500OnError(
  {
    name,
    userId,
    email,
    position,
    organizationId,
  }: { name: string; userId: string; email: string; position: string; organizationId: number },
  res: NextApiResponse
) {
  if (!userId || isFauId(userId)) {
    res.status(403).send('Invalid or unauthorized user');
    return;
  }
  if (!name || !email || !position || !organizationId)
    return res.status(422).send('Missing required fields');
  const result = await executeAndEndSet500OnError(
    `INSERT INTO recruiterProfile 
      (name, userId, email, position, organizationId) 
     VALUES (?, ?, ?, ?, ?)`,
    [name, userId, email, position, organizationId],
    res
  );
  return result;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const { name, email, position, organizationId } = req.body;
  const result = await createRecruiterProfileOrSet500OnError(
    { name, userId, email, position, organizationId },
    res
  );
  if (!result) return;
  res.status(201).end();
}
