import { NextApiRequest, NextApiResponse } from 'next';
import { executeQuery, checkIfGetOrSetError } from '../../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { universityId, instanceId } = req.query;

  if (!universityId || !instanceId) {
    return res.status(400).end('Missing universityId or instanceId');
  }

  const result = (await executeQuery(
    `
    SELECT holidays
    FROM semesterInfo
    WHERE universityId = ? AND instanceId = ?
    `,
    [universityId, instanceId]
  )) as { holidays: string }[];

  if (result.length === 0) {
    return res.status(404).end('No holiday data found');
  }

  res.status(200).json({ holidays: JSON.parse(result[0].holidays) });
}
