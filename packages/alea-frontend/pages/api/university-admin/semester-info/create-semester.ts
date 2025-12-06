import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@alea/utils';
import { getUserIdIfAuthorizedOrSetError } from '../../access-control/resource-utils';
import {
  checkIfPostOrSetError,
  executeDontEndSet500OnError,
  executeAndEndSet500OnError,
} from '../../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { universityId, instanceId, semesterStart, semesterEnd, lectureStartDate, lectureEndDate } =
    req.body;

  if (
    !universityId ||
    !instanceId ||
    !semesterStart ||
    !semesterEnd ||
    !lectureStartDate ||
    !lectureEndDate
  ) {
    return res.status(400).end();
  }
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.UNIVERSITY_SEMESTER_DATA,
    Action.MUTATE,
    { universityId }
  );
  if (!userId) return;

  const existing = await executeDontEndSet500OnError(
    `SELECT 1 FROM semesterInfo WHERE universityId = ? AND instanceId = ?`,
    [universityId, instanceId],
    res
  );
  if (!existing) return;

  if (Array.isArray(existing) && existing.length > 0) {
    return res.status(409).end();
  }

  await executeAndEndSet500OnError(
    `INSERT INTO semesterInfo
      (universityId, instanceId, semesterStart, semesterEnd, lectureStartDate, lectureEndDate, userId, holidays)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      universityId,
      instanceId,
      semesterStart,
      semesterEnd,
      lectureStartDate,
      lectureEndDate,
      userId,
      '[]',
    ],
    res
  );

  res.status(200).end();
}
