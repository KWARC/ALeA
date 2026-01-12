import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeQuery } from '../comment-utils';

interface SemesterInfoRow {
  universityId: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { institutionId } = req.query;

  if (!institutionId || typeof institutionId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query parameter: institutionId must be a string' });
  }

  const result = await executeQuery<SemesterInfoRow[]>(
    `SELECT DISTINCT universityId 
     FROM semesterInfo 
     WHERE universityId = ? 
     LIMIT 1`,
    [institutionId]
  );

  if ('error' in result) {
    console.error('Database error validating institutionId:', result.error);
    return res.status(500).json({ 
      error: 'Failed to validate institutionId',
      details: result.error instanceof Error ? result.error.message : String(result.error)
    });
  }

  if (!result || result.length === 0) {
    return res.status(404).json({ 
      error: `InstitutionId ${institutionId} not found`,
      exists: false 
    });
  }

  return res.status(200).json({
    exists: true,
    institutionId: result[0].universityId,
  });
}
