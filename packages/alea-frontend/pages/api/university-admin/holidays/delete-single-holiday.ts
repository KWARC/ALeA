import { executeQuery, checkIfPostOrSetError, getUserIdOrSetError } from '../../comment-utils';

export default async function handler(req, res) {
  if (!checkIfPostOrSetError(req, res)) return;

  //TODO: We will use getUserIdAuthoriseSetError
const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const { universityId, instanceId, dateToDelete } = req.body;

  if (!universityId || !instanceId || !dateToDelete) {
    return res.status(400).json({ message: 'Missing universityId, instanceId, or dateToDelete' });
  }

  const result = await executeQuery(
    `
    SELECT holidays
    FROM holidays
    WHERE universityId = ? AND instanceId = ?
    `,
    [universityId, instanceId]
  );

  const existing = result[0];
  if (!existing || !existing.holidays) {
    return res.status(404).json({ message: 'No holidays found for the given university and instance' });
  }

  let holidays: any[];
  try {
    holidays = JSON.parse(existing.holidays);
  } catch {
    return res.status(500).json({ message: 'Failed to parse holidays JSON' });
  }

  const filtered = holidays.filter((h: any) => h.date !== dateToDelete);

  await executeQuery(
    `
    UPDATE holidays
    SET holidays = ?
    WHERE universityId = ? AND instanceId = ?
    `,
    [JSON.stringify(filtered), universityId, instanceId]
  );

  res.status(200).json({
    success: true,
    message: `Holiday on ${dateToDelete} deleted successfully`,
  });
}
