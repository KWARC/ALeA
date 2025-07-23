import { executeQuery, checkIfPostOrSetError } from '../../comment-utils';

export default async function handler(req, res) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { universityId, instanceId } = req.body;

  if (!universityId || !instanceId) {
    return res.status(400).json({ message: 'Missing universityId or instanceId' });
  }

  const result = await executeQuery(
    `
    DELETE FROM semester_info
    WHERE university_id = ? AND instance_id = ?
    `,
    [universityId, instanceId]
  );

  res.status(200).json({ success: true, result });
}
