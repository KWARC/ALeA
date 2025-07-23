// pages/api/university-admin/holidays/list-holidays.ts

import { executeQuery, checkIfGetOrSetError } from '../../comment-utils';

export default async function handler(req, res) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { universityId, instanceId } = req.query;

  if (!universityId || !instanceId) {
    return res.status(400).json({ message: 'Missing universityId or instanceId' });
  }

  const result = await executeQuery(
    `
    SELECT holidays
    FROM holidays
    WHERE university_id = ? AND instance_id = ?
    `,
    [universityId, instanceId]
  )as { holidays: string }[];

  if (result.length === 0) {
    return res.status(404).json({ message: 'No holiday data found' });
  }

  res.status(200).json({ holidays: JSON.parse(result[0].holidays) });
}
