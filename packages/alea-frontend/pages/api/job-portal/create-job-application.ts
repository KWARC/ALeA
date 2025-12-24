import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError, executeQuery } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';

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
  const { jobPostId } = req.body;
  if (!jobPostId) return res.status(422).end();
  const results = await executeAndEndSet500OnError(
    'SELECT * FROM jobApplication WHERE jobPostId = ? AND applicantId = ?',
    [jobPostId, userId],
    res
  );
  if (!results) return;
  if (results.length) return res.status(200).send('Already applied');

  const deadlineCheck = await executeAndEndSet500OnError(
    `SELECT 1 FROM jobPost WHERE id = ?
      AND applicationDeadline >= NOW() LIMIT 1`,
    [jobPostId],
    res
  );
  if (!deadlineCheck) return;
  if (!deadlineCheck.length) {
    return res.status(400).send('Application deadline has passed');
  }

  const result = await executeAndEndSet500OnError(
    `INSERT INTO jobApplication 
      (jobPostId,applicantId,applicationStatus) 
     VALUES (?,?,?)`,
    [jobPostId, userId, 'APPLIED'],
    res
  );
  if (!result) return;
  res.status(201).end();
}
