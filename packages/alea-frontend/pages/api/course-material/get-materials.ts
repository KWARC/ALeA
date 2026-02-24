import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { universityId, courseId, semesterId } = req.query;

  if (!universityId || !courseId || !semesterId) {
    return res.status(422).send('Missing universityId, courseId, or semesterId');
  }

  const results = await executeAndEndSet500OnError(
    `SELECT id, materialName, materialType as type, storageFileName, mimeType, sizeBytes, url
     FROM CourseMaterials 
     WHERE universityId = ? AND courseId = ? AND semesterId = ? 
     ORDER BY createdAt DESC`,
    [universityId, courseId, semesterId],
    res
  );

  if (!results) return;

  return res.status(200).json(results);
}
