import { executeQuery, checkIfPostOrSetError, getUserIdOrSetError } from '../../comment-utils';

export default async function handler(req, res) {
  if (!checkIfPostOrSetError(req, res)) return;

  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const { universityId, instanceId } = req.body;

  if (!universityId || !instanceId) {
    return res.status(400).json({ message: 'Missing universityId or instanceId' });
  }

  const result = await executeQuery(
    `
    DELETE FROM holidays
    WHERE universityId = ? AND instanceId = ?
    `,
    [universityId, instanceId]
  );

  res.status(200).json({
    success: true,
    message: 'Holidays deleted successfully',
    result,
  });
}
