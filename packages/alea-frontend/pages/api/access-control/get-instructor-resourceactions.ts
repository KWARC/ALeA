import { NextApiRequest, NextApiResponse } from 'next';
import {
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { ResourceAction } from '@stex-react/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { courseId, instanceId } = req.query;
  if (!courseId || !instanceId) {
    return res.status(400).json({ message: 'Missing courseId or instanceId' });
  }

  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const aclIds = [
    `${courseId}-${instanceId}-instructors`,
    `${courseId}-${instanceId}-enrollments`,
    `${courseId}-${instanceId}-staff`,
  ];

  const placeholders = aclIds.map(() => '?').join(', ');
  const query = `
    SELECT aclId, resourceId, actionId, createdAt, updatedAt
    FROM ResourceAccess
    WHERE aclId IN (${placeholders})
  `;

  const resourceAccessList = await executeAndEndSet500OnError<ResourceAction[]>(
    query,
    aclIds,
    res
  );

  if (!resourceAccessList) return;

  return res.status(200).json(resourceAccessList);
}
