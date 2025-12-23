import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeDontEndSet500OnError, getUserId } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const jobPostId = req.query.jobPostId;
  const userId = await getUserId(req);
  if (!userId || !jobPostId) return res.status(422).send('Missing required fields');
  const results: any = await executeDontEndSet500OnError(
    `SELECT id,jobPostId,applicantId,applicationStatus
    FROM jobApplication 
    WHERE jobPostId = ? AND applicantId=?`,
    [jobPostId, userId],
    res
  );
  if (!results) return;
  res.status(200).json(results);
}
