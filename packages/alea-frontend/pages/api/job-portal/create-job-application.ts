import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeDontEndSet500OnError,
} from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, CURRENT_TERM, ResourceName } from '@stex-react/utils';

export async function checkJobApplicationExistsOrSet500OnError(
  id: number,
  userId: string,
  res: NextApiResponse
) {
  const results: any = await executeDontEndSet500OnError(
    'SELECT * FROM jobApplication WHERE jobPostId = ? AND applicantId = ?',
    [id, userId],
    res
  );

  return !!results?.length;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.JOB_PORTAL,
    Action.APPLY,
    { instanceId: CURRENT_TERM }
  );
  if (!userId) return;
  const { jobPostId, applicationStatus } = req.body;
  const jobApplicationExists = await checkJobApplicationExistsOrSet500OnError(
    jobPostId,
    userId,
    res
  );
  if (jobApplicationExists) return res.status(200).send('Already applied');

  const result = await executeAndEndSet500OnError(
    `INSERT INTO jobApplication 
      (jobPostId,applicantId,applicationStatus) 
     VALUES (?,?,?)`,
    [jobPostId, userId, applicationStatus],
    res
  );
  if (!result) return;
  res.status(201).end();
}
