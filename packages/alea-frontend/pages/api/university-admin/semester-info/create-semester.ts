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

  if (!universityId || !instanceId || !semesterStart || !semesterEnd || !lectureStartDate || !lectureEndDate || !updatedBy || !timeZone) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Type assertion here: result can be either any[] or { error: any }
  const existing = await executeQuery(
    `SELECT 1 FROM semester_info WHERE university_id = ? AND instance_id = ?`,
    [universityId, instanceId]
  ) as any[] | { error: any };

  if ('error' in existing) {
    return res.status(500).json({ message: 'Database error', error: existing.error });
  }

  if (Array.isArray(existing) && existing.length > 0) {
    return res.status(409).json({ message: 'Semester already exists for this university and instance' });
  }

  const result = await executeQuery(
    `INSERT INTO semester_info
      (university_id, instance_id, semester_start, semester_end, lecture_start_date, lecture_end_date, updated_by,time_zone)
     VALUES (?, ?, ?, ?, ?, ?, ?,?)`,
    [universityId, instanceId, semesterStart, semesterEnd, lectureStartDate, lectureEndDate, updatedBy, timeZone]
  ) as { error?: any };  // You only care about possible error in result

  if (result.error) {
    return res.status(500).json({ message: 'Insert failed', error: result.error });
  }

  res.status(200).json({ success: true });
}
