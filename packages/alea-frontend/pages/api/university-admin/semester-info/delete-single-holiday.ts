import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@alea/utils';
import { getUserIdIfAuthorizedOrSetError } from '../../access-control/resource-utils';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../../comment-utils';

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
  if (!userId) {
    return;
  }

  const result = await executeAndEndSet500OnError(
    `
      SELECT holidays
      FROM semesterInfo
      WHERE universityId = ? AND instanceId = ?
      `,
    [universityId, instanceId],
    res
  );

  if (!result?.length || !result[0].holidays) {
    return res.status(404).end('No holiday data found for the specified university and instance');
  }

  let holidays: any[];
  try {
    holidays = JSON.parse(result[0].holidays);
  } catch (error) {
    return res.status(500).end('Failed to parse holidays JSON');
  }

  const filtered = holidays.filter((h: any) => h.date !== dateToDelete);

  await executeAndEndSet500OnError(
    `
      UPDATE semesterInfo
      SET holidays = ?, userId = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE universityId = ? AND instanceId = ?
      `,
    [JSON.stringify(filtered), userId, universityId, instanceId],
    res
  );

  res.status(200).end('Holiday deleted successfully');
}
