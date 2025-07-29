import { executeQuery, checkIfPostOrSetError, getUserIdOrSetError } from '../../comment-utils';

export default async function handler(req, res) {
  if (!checkIfPostOrSetError(req, res)) return;

  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const {
    universityId,
    instanceId,
    semesterStart,
    semesterEnd,
    lectureStartDate,
    lectureEndDate,
    updatedBy,
    timeZone,
  } = req.body;

  if (!universityId || !instanceId) {
    return res.status(400).json({ message: 'Missing universityId or instanceId' });
  }

  const result = (await executeQuery(
    `
    UPDATE semesterInfo
    SET
      semesterStart = ?,
      semesterEnd = ?,
      lectureStartDate = ?,
      lectureEndDate = ?,
      updatedBy = ?,
      timeZone = ?,
      updatedTimestamp = CURRENT_TIMESTAMP
    WHERE universityId = ? AND instanceId = ?
    `,
    [
      semesterStart,
      semesterEnd,
      lectureStartDate,
      lectureEndDate,
      updatedBy,
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
