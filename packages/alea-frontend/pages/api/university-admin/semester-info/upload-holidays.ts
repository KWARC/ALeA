import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@stex-react/utils';
import { getUserIdIfAuthorizedOrSetError } from '../../access-control/resource-utils';
import { executeQuery, checkIfPostOrSetError } from '../../comment-utils';

function formatDateToDDMMYYYY(date: string): string | null {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { universityId, instanceId, holidays } = req.body;

  if (!universityId || !instanceId || !Array.isArray(holidays)) {
    return res.status(400).end('Missing or invalid data');
  }

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.UNIVERSITY_SEMESTER_DATA,
    Action.MUTATE,
    { universityId }
  );
  if (!userId) return;

  const formattedHolidays = holidays
    .map((holiday) => {
      const formattedDate = formatDateToDDMMYYYY(holiday.date);
      if (!formattedDate) return null;
      return { ...holiday, date: formattedDate };
    })
    .filter(Boolean);

  if (formattedHolidays.length === 0) {
    return res.status(400).end('All holiday dates were invalid');
  }

  await executeQuery(
    `
    UPDATE semesterInfo
    SET holidays = ?, userId = ?
    WHERE universityId = ? AND instanceId = ?
    `,
    [JSON.stringify(formattedHolidays), userId, universityId, instanceId]
  );

  res.status(200).end('Holiday data uploaded successfully');
}
