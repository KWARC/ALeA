import { executeQuery, checkIfPostOrSetError, getUserIdOrSetError } from '../../comment-utils';

function formatDateToDDMMYYYY(date: string): string | null {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default async function handler(req, res) {
  if (!checkIfPostOrSetError(req, res)) return;

  //TODO: We will use getUserIdAuthoriseSetError
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const { universityId, instanceId, holidays } = req.body;

  if (!universityId || !instanceId || !Array.isArray(holidays)) {
    return res.status(400).json({ message: 'Missing or invalid data' });
  }

  const formattedHolidays = holidays
    .map((holiday) => {
      const formattedDate = formatDateToDDMMYYYY(holiday.date);
      if (!formattedDate) return null;
      return { ...holiday, date: formattedDate };
    })
    .filter(Boolean);

  if (formattedHolidays.length === 0) {
    return res.status(400).json({ message: 'All holiday dates were invalid' });
  }

  const result = await executeQuery(
    `
    INSERT INTO holidays (universityId, instanceId, holidays)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE holidays = VALUES(holidays)
    `,
    [universityId, instanceId, JSON.stringify(formattedHolidays)]
  );

  res.status(200).json({
    success: true,
    message: 'Holiday data uploaded successfully',
    result,
  });
}
