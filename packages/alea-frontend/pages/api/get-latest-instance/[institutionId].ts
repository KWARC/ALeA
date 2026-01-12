import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeQuery } from '../comment-utils';

interface SemesterInfoRow {
  instanceId: string;
  semesterStart: Date | string;
  createdAt: Date | string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { institutionId } = req.query;

  if (!institutionId || typeof institutionId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query parameter: institutionId must be a string' });
  }

  const result = await executeQuery<SemesterInfoRow[]>(
    `SELECT instanceId, semesterStart, createdAt 
     FROM semesterInfo 
     WHERE universityId = ? 
     ORDER BY COALESCE(semesterStart, createdAt) DESC 
     LIMIT 1`,
    [institutionId]
  );

  if ('error' in result) {
    console.error('Database error fetching latest instanceId:', result.error);
    return res.status(500).json({ error: 'Failed to fetch latest instanceId' });
  }

  if (!result || result.length === 0) {
    return res.status(404).json({ 
      error: `No semester information found for institution: ${institutionId}`,
      instanceId: null 
    });
  }

  const latestInstance = result[0];
  
  return res.status(200).json({
    instanceId: latestInstance.instanceId,
  });
}

