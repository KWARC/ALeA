import { Action, ResourceName } from '@stex-react/utils';
import { getUserIdIfAuthorizedOrSetError } from '../../access-control/resource-utils';
import { executeQuery, checkIfPostOrSetError } from '../../comment-utils';

export default async function handler(req, res) {
  if (!checkIfPostOrSetError(req, res)) return;

  const userId = await getUserIdIfAuthorizedOrSetError(req,res,ResourceName.UNIVERSITY_SEMESTER_DATA,Action.MUTATE,{universityId: req.query.universityId});
    if (!userId) return;

  const {
    universityId,
    instanceId,
    semesterStart,
    semesterEnd,
    lectureStartDate,
    lectureEndDate,
    timeZone,
  } = req.body;

  if (!universityId || !instanceId) {
    return res.status(400).json({ message: 'Missing universityId, instanceId' });
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
      timeZone = ?,
      updatedAt = CURRENT_TIMESTAMP
    WHERE universityId = ? AND instanceId = ?
    `,
    [
      semesterStart,
      semesterEnd,
      lectureStartDate,
      lectureEndDate,
      userId,
      timeZone || null,
      universityId,
      instanceId,
    ]
  )) as { affectedRows?: number } | { error: any };

  if ('error' in result) {
    return res.status(500).json({ message: 'Database error', error: result.error });
  }

  res.status(200).json({
    success: true,
    message: (result?.affectedRows ?? 0) > 0 ? 'Semester updated successfully' : 'No rows updated',
  });
}
