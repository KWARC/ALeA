import { executeQuery, checkIfPostOrSetError, getUserIdOrSetError } from '../../comment-utils';

export default async function handler(req, res) {
  if (!checkIfPostOrSetError(req, res)) return;

  //TODO: We will use getUserIdAuthoriseSetError
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

  if (
    !universityId ||
    !instanceId ||
    !semesterStart ||
    !semesterEnd ||
    !lectureStartDate ||
    !lectureEndDate ||
    !updatedBy ||
    !timeZone
  ) {
    return res.status(400).json({ message: 'Missing required fields' });
  }


  const existing = (await executeQuery(
    `SELECT 1 FROM semesterInfo WHERE universityId = ? AND instanceId = ?`,
    [universityId, instanceId]
  )) as any[] | { error: any };

  if ('error' in existing) {
    return res.status(500).json({ message: 'Database error', error: existing.error });
  }

  if (Array.isArray(existing) && existing.length > 0) {
    return res
      .status(409)
      .json({ message: 'Semester already exists for this university and instance' });
  }

  const result = (await executeQuery(
    `INSERT INTO semesterInfo
      (universityId, instanceId, semesterStart, semesterEnd, lectureStartDate, lectureEndDate, updatedBy, timeZone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      universityId,
      instanceId,
      semesterStart,
      semesterEnd,
      lectureStartDate,
      lectureEndDate,
      updatedBy,
      timeZone,
    ]
  )) as { error?: any };

  if (result.error) {
    return res.status(500).json({ message: 'Insert failed', error: result.error });
  }

  res.status(200).json({ success: true });
}
