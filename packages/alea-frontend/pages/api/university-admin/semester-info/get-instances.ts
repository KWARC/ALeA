import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@stex-react/utils';
import { getUserIdIfAuthorizedOrSetError } from '../../access-control/resource-utils';
import { executeQuery } from '../../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end('Only GET requests allowed');
  }

  const { universityId: queryUniversityId } = req.query;
  if (!queryUniversityId || typeof queryUniversityId !== 'string') {
    return res.status(400).send('Invalid university id');
  }

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.UNIVERSITY_SEMESTER_DATA,
    Action.MUTATE,
    { universityId: queryUniversityId }
  );
  if (!userId) return;

  const { universityId } = req.query;

  if (!universityId || typeof universityId !== 'string') {
    return res.status(400).end('Missing or invalid query parameter: universityId must be a string');
  }

  const result = await executeQuery<Array<{ instanceId: string }>>(
    `SELECT DISTINCT instanceId FROM semesterInfo WHERE universityId = ?`,
    [universityId]
  );

  if ('error' in result) {
    return res.status(500).end('Failed to fetch semester instances');
  }

  const instanceArray = result.map((r) => r.instanceId);

  return res.status(200).json({
    success: true,
    message:
      instanceArray.length > 0
        ? 'Semester instances fetched successfully'
        : 'No semester instances found for the specified universityId',
    data: instanceArray,
  });
}
