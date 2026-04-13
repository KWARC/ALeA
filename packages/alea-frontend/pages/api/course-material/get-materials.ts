import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { universityId, courseId } = req.query;

  if (!universityId || !courseId) {
    return res.status(422).send('Missing universityId, courseId');
  }

  const results = await executeAndEndSet500OnError(
    `SELECT id, materialName, materialType as type, mimeType, sizeBytes, url, createdAt, instanceId, validFrom, validTill
     FROM CourseMaterials 
     WHERE universityId = ? AND courseId = ? 
     ORDER BY createdAt DESC`,
    [universityId, courseId],
    res
  );

  if (!results) return;

  const serializedResults = results.map((r: any) => ({
    ...r,
    sizeBytes: typeof r.sizeBytes === 'bigint' ? r.sizeBytes.toString() : r.sizeBytes,
  }));

  return res.status(200).json(serializedResults);
}
