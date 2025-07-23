import { executeQuery, checkIfGetOrSetError } from '../../comment-utils';

export default async function handler(req, res) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { universityId, instanceId } = req.query;

  const data = await executeQuery(
    `
    SELECT * FROM semester_info
    WHERE university_id = ? AND instance_id = ?
    `,
    [universityId, instanceId]
  ) as any[] | { error: any };

  if ('error' in data) {
    return res.status(500).json({ message: 'Database error', error: data.error });
  }

  res.status(200).json({ semesterInfo: data });
}
