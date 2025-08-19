import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@stex-react/utils';
import { getUserIdIfAuthorizedOrSetError } from '../../access-control/resource-utils';
import { executeQuery, checkIfPostOrSetError } from '../../comment-utils';

function formatDateToDDMMYYYY(date: string): string | null {
  // Handle dates from HTML date inputs (YYYY-MM-DD format)
  if (date && typeof date === 'string') {
    // Check if it's already in DD/MM/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      return date;
    }
    
    // Handle YYYY-MM-DD format from HTML date inputs
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // Fallback to Date constructor for other formats
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
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

  const formattedHolidays = holidays
    .map((holiday) => {
      const formattedDate = formatDateToDDMMYYYY(holiday.date);
      if (!formattedDate) {
        return null;
      }
      return { ...holiday, date: formattedDate };
    })
    .filter(Boolean);

  // Allow empty arrays for deletion, but validate dates when holidays exist
  if (holidays.length > 0 && formattedHolidays.length === 0) {
    return res.status(400).end('All holiday dates were invalid');
  }

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
