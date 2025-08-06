import { executeQuery, checkIfPostOrSetError, getUserIdOrSetError } from '../../comment-utils';

export default async function handler(req, res) {
  if (!checkIfPostOrSetError(req, res)) return;

  //TODO: We will use getUserIdAuthoriseSetError
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const { universityId, instanceId } = req.body;

  if (!universityId || !instanceId) {
    return res.status(400).json({ message: 'Missing universityId or instanceId' });
  }

  try {
    const result = (await executeQuery(
      `
      UPDATE semesterInfo
      SET holidays = '[]', userId = ?
      WHERE universityId = ? AND instanceId = ?
      `,
      [userId, universityId, instanceId]
    )) as { affectedRows: number };

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: 'No matching semester found for the given universityId and instanceId' });
    }

    res.status(200).json({
      success: true,
      message: 'All holidays deleted successfully',
      result,
    });
  } catch (error) {
    console.error('Error deleting holidays:', error);
    res.status(500).json({ message: 'Internal Server Error', error });
  }
}
