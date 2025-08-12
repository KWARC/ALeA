import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@stex-react/utils';
import { getUserIdIfAuthorizedOrSetError } from '../../access-control/resource-utils';
import { executeQuery, checkIfPostOrSetError } from '../../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { universityId, instanceId, dateToDelete } = req.body;

  if (!universityId || !instanceId || !dateToDelete) {
    return res.status(400).end('Missing universityId, instanceId, or dateToDelete');
  }

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.UNIVERSITY_SEMESTER_DATA,
    Action.MUTATE,
    { universityId }
  );
  if (!userId) return;

  const result = await executeQuery(
    `
    SELECT holidays
    FROM semesterInfo
    WHERE universityId = ? AND instanceId = ?
    `,
    [universityId, instanceId]
  );

  const existing = result[0];
  if (!existing || !existing.holidays) {
    return res.status(404).end('No holiday data found for the specified university and instance');
  }

  let holidays: any[];
  try {
    holidays = JSON.parse(existing.holidays);
  } catch {
    return res.status(500).end('Failed to parse holidays JSON');
  }

  const filtered = holidays.filter((h: any) => h.date !== dateToDelete);

  await executeQuery(
    `
    UPDATE semesterInfo
    SET holidays = ?, userId = ?
    WHERE universityId = ? AND instanceId = ?
    `,
    [JSON.stringify(filtered), userId, universityId, instanceId]
  );

  res.status(200);
}
