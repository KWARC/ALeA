import { NextApiRequest, NextApiResponse } from 'next';
import { executeQuery, checkIfGetOrSetError } from '../../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { universityId, instanceId } = req.query;

  if (!universityId || !instanceId) {
    return res.status(400).end('Missing universityId or instanceId');
  }

  try {
    const result = (await executeQuery(
      `
      SELECT holidays
      FROM semesterInfo
      WHERE universityId = ? AND instanceId = ?
      `,
      [universityId, instanceId]
    )) as { holidays: string }[];

    if (result.length === 0) {
      // Return empty array instead of 404 when no data exists
      return res.status(200).send({ holidays: [] });
    }

    try {
      const holidays = JSON.parse(result[0].holidays || '[]');
      res.status(200).send({ holidays });
    } catch (error) {
      res.status(200).send({ holidays: [] });
    }
  } catch (error) {
    res.status(500).end('Database error');
  }
}
