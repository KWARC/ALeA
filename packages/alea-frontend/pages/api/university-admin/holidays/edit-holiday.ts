import { executeQuery, checkIfPostOrSetError, getUserIdOrSetError } from '../../comment-utils';

export default async function handler(req, res) {
  if (!checkIfPostOrSetError(req, res)) return;

  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const { universityId, instanceId, originalDate, updatedHoliday } = req.body;

  if (!universityId || !instanceId || !originalDate || !updatedHoliday) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const existing = (await executeQuery(
      `SELECT holidays FROM holidays WHERE universityId = ? AND instanceId = ?`,
      [universityId, instanceId]
    )) as { holidays: string }[];

    if (!existing.length) {
      return res.status(404).json({ message: 'Holiday data not found' });
    }

    const holidays = JSON.parse(existing[0].holidays || '[]');

    const index = holidays.findIndex((h) => h.date === originalDate);
    if (index === -1) {
      return res.status(404).json({ message: 'Holiday not found by date' });
    }

    holidays[index] = updatedHoliday;

    await executeQuery(
      `UPDATE holidays SET holidays = ? WHERE universityId = ? AND instanceId = ?`,
      [JSON.stringify(holidays), universityId, instanceId]
    );

    res.status(200).json({
      success: true,
      message: 'Holiday updated successfully',
      updatedHoliday,
    });
  } catch (error) {
    console.error('Error editing holiday:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
