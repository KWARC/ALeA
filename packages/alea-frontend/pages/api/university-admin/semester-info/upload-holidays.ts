import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@stex-react/utils';
import { getUserIdIfAuthorizedOrSetError } from '../../access-control/resource-utils';
import { executeQuery, checkIfPostOrSetError } from '../../comment-utils';

function formatDateToDDMMYYYY(date: string): string | null {
  if (typeof date !== 'string') return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    return date;
  }
  return null;
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
  if (!userId) {
    return;
  }

  const invalidDates = holidays.filter((holiday) => !formatDateToDDMMYYYY(holiday.date));
  if (holidays.length > 0 && invalidDates.length > 0) {
    return res.status(400).end('Invalid holiday date format. Expected DD/MM/YYYY.');
  }

  const formattedHolidays = holidays.map((holiday) => ({ ...holiday, date: holiday.date }));

  try {
    await executeQuery(
      `
      INSERT INTO semesterInfo (universityId, instanceId, holidays, userId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
      holidays = VALUES(holidays),
      userId = VALUES(userId),
      updatedAt = CURRENT_TIMESTAMP
      `,
      [universityId, instanceId, JSON.stringify(formattedHolidays), userId]
    );

    res.status(200).end('Holiday data uploaded successfully');
  } catch (error) {
    res.status(500).end('Database error');
  }
}
