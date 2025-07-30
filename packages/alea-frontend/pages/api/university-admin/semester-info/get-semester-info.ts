import { executeQuery, checkIfGetOrSetError, getUserIdOrSetError } from '../../comment-utils';

export default async function handler(req, res) {
  if (!checkIfGetOrSetError(req, res)) return;

  //TODO: We will use getUserIdAuthoriseSetError
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const { universityId, instanceId } = req.query;

  const data = (await executeQuery(
    `
    SELECT * FROM semesterInfo
    WHERE universityId = ? AND instanceId = ?
    `,
    [universityId, instanceId]
  )) as any[] | { error: any };

  if ('error' in data) {
    return res.status(500).json({ message: 'Database error', error: data.error });
  }

  res.status(200).json({ semesterInfo: data });
}
