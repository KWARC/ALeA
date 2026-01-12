import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeQuery } from '../../comment-utils';

interface SemesterInfoRow {
  instanceId: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { institutionId, instanceId } = req.query;

  if (!institutionId || typeof institutionId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query parameter: institutionId must be a string' });
  }

  if (!instanceId || typeof instanceId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query parameter: instanceId must be a string' });
  }

  const result = await executeQuery<SemesterInfoRow[]>(
    `SELECT instanceId 
     FROM semesterInfo 
     WHERE universityId = ? AND instanceId = ? 
     LIMIT 1`,
    [institutionId, instanceId]
  );

  if ('error' in result) {
    console.error('Database error validating instanceId:', result.error);
    return res.status(500).json({ 
      error: 'Failed to validate instanceId',
      details: result.error instanceof Error ? result.error.message : String(result.error)
    });
  }

  if (!result || result.length === 0) {
    return res.status(404).json({ 
      error: `InstanceId ${instanceId} not found for institution: ${institutionId}`,
      exists: false 
    });
  }

  return res.status(200).json({
    exists: true,
    instanceId: result[0].instanceId,
  });
}
