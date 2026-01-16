import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const institutionId = req.query.institutionId as string;

  if (!institutionId) {
    return res.status(422).json({ error: 'Missing institutionId parameter' });
  }

  const result = await executeAndEndSet500OnError(
    `SELECT instanceId FROM semesterInfo WHERE universityId = ? ORDER BY semesterStart DESC, createdAt DESC LIMIT 1`,
    [institutionId],
    res
  );

  if (!result || result.length === 0) {
    return res.status(404).json({ error: 'No instance found for institutionId' });
  }

  res.status(200).json({ instanceId: result[0].instanceId });
}
