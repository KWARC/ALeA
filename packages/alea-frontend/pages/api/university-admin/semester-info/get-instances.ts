import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeQuery } from '../../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { universityId } = req.query;

  if (!universityId || typeof universityId !== 'string') {
    return res.status(400).end('Missing or invalid query parameter: universityId must be a string');
  }

  const result = await executeQuery<Array<{ instanceId: string }>>(
    `SELECT instanceId FROM semesterInfo WHERE universityId = ? GROUP BY instanceId ORDER BY MAX(createdAt) DESC`,
    [universityId]
  );

  if ('error' in result) {
    return res.status(500).end('Failed to fetch semester instances');
  }

  const instanceArray = result.map((r) => r.instanceId);

  return res.status(200).send({
    data: instanceArray,
  });
}
