import { executeQuery, checkIfPostOrSetError, getUserIdOrSetError } from '../../comment-utils';

type DatabaseResult<T> = T[] | { error: any };

export default async function handler(req, res) {
  if (!checkIfPostOrSetError(req, res)) return;

  //TODO: We will use getUserIdAuthoriseSetError
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const { universityId, instanceId, originalDate, updatedHoliday } = req.body as {
    universityId: string;
    instanceId: string;
    originalDate: string;
    updatedHoliday: {
      date: string;
      name: string;
    };
  };

  if (
    !universityId ||
    !instanceId ||
    !originalDate ||
    !updatedHoliday?.date ||
    !updatedHoliday?.name
  ) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
    });
  }

  try {
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(originalDate) || !dateRegex.test(updatedHoliday.date)) {
      return res.status(400).json({
        success: false,
        message: 'Dates must be in DD/MM/YYYY format',
      });
    }

    const existingResult = (await executeQuery<{ holidays: string }[]>(
      `SELECT holidays FROM semesterInfo WHERE universityId = ? AND instanceId = ?`,
      [universityId, instanceId]
    )) as DatabaseResult<{ holidays: string }>;

    if ('error' in existingResult) {
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: existingResult.error,
      });
    }

    if (!existingResult.length) {
      return res.status(404).json({
        success: false,
        message: 'Semester not found',
      });
    }

    let holidays: Array<{ date: string; name: string }>;
    try {
      holidays = JSON.parse(existingResult[0].holidays || '[]');
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Invalid holidays data format',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const holidayIndex = holidays.findIndex((h) => h.date === originalDate);
    if (holidayIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Holiday not found with date: ${originalDate}`,
      });
    }

    const updatedHolidays = [...holidays];
    updatedHolidays[holidayIndex] = {
      date: updatedHoliday.date,
      name: updatedHoliday.name,
    };

    const updateResult = (await executeQuery<{ affectedRows: number }>(
      `UPDATE semesterInfo
       SET holidays = ?, userId = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE universityId = ? AND instanceId = ?`,
      [JSON.stringify(updatedHolidays), userId, universityId, instanceId]
    )) as DatabaseResult<{ affectedRows: number }>;

    if ('error' in updateResult) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update holidays',
        error: updateResult.error,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Holiday updated successfully',
      data: {
        previousDate: originalDate,
        updatedHoliday: {
          date: updatedHoliday.date,
          name: updatedHoliday.name,
        },
      },
    });
  } catch (error) {
    console.error('Error editing holiday:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
