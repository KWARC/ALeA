import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@stex-react/utils';
import { getUserIdIfAuthorizedOrSetError } from '../../access-control/resource-utils';
import { executeQuery, checkIfPostOrSetError } from '../../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { universityId: queryUniversityId } = req.query;
  if (!queryUniversityId || typeof queryUniversityId !== 'string') {
    return res.status(400).send('Invalid university id');
  }

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.UNIVERSITY_SEMESTER_DATA,
    Action.MUTATE,
    { universityId: queryUniversityId }
  );
  if (!userId) return;

  const {
    universityId,
    instanceId,
    semesterStart,
    semesterEnd,
    lectureStartDate,
    lectureEndDate,
    // timeZone,
  } = req.body;

  if (!universityId || !instanceId) {
    return res.status(400).end('Missing universityId, instanceId');
  }

  const result = (await executeQuery(
    `
    UPDATE semesterInfo
    SET
      semesterStart = ?,
      semesterEnd = ?,
      lectureStartDate = ?,
      lectureEndDate = ?,
      userId = ?,
      updatedAt = CURRENT_TIMESTAMP
    WHERE universityId = ? AND instanceId = ?
    `,
    [
      semesterStart,
      semesterEnd,
      lectureStartDate,
      lectureEndDate,
      userId,
      universityId,
      instanceId,
    ]
  )) as { affectedRows?: number } | { error: any };

  if ('error' in result) {
    return res.status(500).end('Database error');
  }

  res.status(200).json({
    success: true,
    message: (result?.affectedRows ?? 0) > 0 ? 'Semester updated successfully' : 'No rows updated',
  });
}
