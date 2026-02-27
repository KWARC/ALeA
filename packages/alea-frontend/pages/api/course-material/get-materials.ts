import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { universityId, courseId, instanceId } = req.query;

  if (!universityId || !courseId || !instanceId) {
    return res.status(422).send('Missing universityId, courseId, or  instanceId');
  }

  const results = await executeAndEndSet500OnError(
    `SELECT id, materialName, materialType as type, mimeType, sizeBytes, url
     FROM CourseMaterials 
     WHERE universityId = ? AND courseId = ? AND  instanceId = ? 
     ORDER BY createdAt DESC`,
    [universityId, courseId, instanceId],
    res
  );

  if (!results) return;

  return res.status(200).json(results);
}
