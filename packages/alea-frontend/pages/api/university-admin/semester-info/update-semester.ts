import { executeQuery, checkIfPostOrSetError } from '../../comment-utils';

export default async function handler(req, res) {
  if (!checkIfPostOrSetError(req, res)) return;

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
    UPDATE semester_info
    SET
      semester_start = ?,
      semester_end = ?,
      lecture_start_date = ?,
      lecture_end_date = ?,
      updated_by = ?,
      time_zone = ?,
      updated_timestamp = CURRENT_TIMESTAMP
    WHERE university_id = ? AND instance_id = ?
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
