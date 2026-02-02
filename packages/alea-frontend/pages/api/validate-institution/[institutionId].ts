import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const institutionId = req.query.institutionId as string;

  if (!institutionId) {
    return res.status(422).json({ error: 'Missing institutionId parameter', details: 'institutionId is required' });
  }

  const result = await executeAndEndSet500OnError(
    `SELECT COUNT(*) as count FROM semesterInfo WHERE universityId = ?`,
    [institutionId],
    res
  );

  if (result === undefined) {
    return res.status(500).json({ error: 'Database error', details: 'Failed to query database' });
  }

  const exists = result[0]?.count > 0;
  res.status(200).json({ exists });
}
