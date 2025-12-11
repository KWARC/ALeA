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
  const { jobPostId, applicationStatus } = req.body;
  if(!jobPostId|| !applicationStatus)return res.status(422).end();
  const results = await executeAndEndSet500OnError(
    'SELECT * FROM jobApplication WHERE jobPostId = ? AND applicantId = ?',
    [jobPostId, userId],
    res
  );
  if (!results) return;
  if (results.length) return res.status(200).send('Already applied');

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
