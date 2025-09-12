import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError, checkIfGetOrSetError } from '../../comment-utils';

function getHolidaysFromDbEntry(serializedHolidays: string) {
  return JSON.parse(serializedHolidays || '[]');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { universityId, instanceId } = req.query;

  if (!universityId || !instanceId) {
    return res.status(400).end('Missing universityId or instanceId');
  }

  const result = (await executeAndEndSet500OnError(
    `
      SELECT holidays
      FROM semesterInfo
      WHERE universityId = ? AND instanceId = ?
      `,
    [universityId, instanceId],
    res
  )) as { holidays: string }[];

  if (!result) return;

  const holidaysInDb = result?.[0]?.holidays || '[]';
  try {
    const holidays = getHolidaysFromDbEntry(holidaysInDb);
    res.status(200).send({ holidays });
  } catch (error) {
    res.status(200).send({ holidays: [] });
  }
}
