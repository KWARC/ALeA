import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, CURRENT_TERM, isFauId, ResourceName } from '@stex-react/utils';
import { RecruiterData } from '@stex-react/api';

export async function createRecruiterProfileOrSet500OnError(
  {
    name,
    userId,
    email,
    position,
    organizationId,
  }: { name: string; userId: string; email: string; position: string; organizationId: string },
  res: NextApiResponse
) {
  if (!userId || isFauId(userId)) return;
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
