import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@stex-react/utils';
import { getUserIdIfAuthorizedOrSetError } from '../../access-control/resource-utils';
import { executeQuery, checkIfPostOrSetError } from '../../comment-utils';

type DatabaseResult<T> = T[] | { error: any };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

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
    return res.status(400).end('Missing required fields');
  }

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.UNIVERSITY_SEMESTER_DATA,
    Action.MUTATE,
    { universityId }
  );
  if (!userId) return;

  try {
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(originalDate) || !dateRegex.test(updatedHoliday.date)) {
      return res.status(400).end('Dates must be in DD/MM/YYYY format');
    }

    const existingResult = (await executeQuery<{ holidays: string }[]>(
      `SELECT holidays FROM semesterInfo WHERE universityId = ? AND instanceId = ?`,
      [universityId, instanceId]
    )) as DatabaseResult<{ holidays: string }>;

    if ('error' in existingResult) {
      return res.status(500).end('Database error');
    }

    if (!existingResult.length) {
      return res.status(404).end('Semester not found');
    }

    let holidays: Array<{ date: string; name: string }>;
    try {
      holidays = JSON.parse(existingResult[0].holidays || '[]');
    } catch (error) {
      return res.status(500).end('Invalid holidays JSON');
    }

    const holidayIndex = holidays.findIndex((h) => h.date === originalDate);
    if (holidayIndex === -1) {
      return res.status(404).end(`Holiday with date ${originalDate} not found`);
    }

    const updatedHolidays = [...holidays];
    updatedHolidays[holidayIndex] = {
      date: updatedHoliday.date,
      name: updatedHoliday.name,
    };

    const updateResult = (await executeQuery<{ affectedRows: number }>(
      `UPDATE semesterInfo
       SET holidays = ?, userId = ?
       WHERE universityId = ? AND instanceId = ?`,
      [JSON.stringify(updatedHolidays), userId, universityId, instanceId]
    )) as DatabaseResult<{ affectedRows: number }>;

    if ('error' in updateResult) {
      return res.status(500).end('Failed to update holiday');
    }

    return res.status(200).end();
  } catch (error) {
    console.error('Error editing holiday:', error);
    return res.status(500).end('Internal server error');
  }
}
