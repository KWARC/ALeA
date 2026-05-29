import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';

function parseUserIds(userIds: string | string[] | undefined) {
  const values = Array.isArray(userIds) ? userIds : userIds?.split(',');
  return [...new Set(values?.map((id) => id.trim()).filter(Boolean) ?? [])];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  if (!(await getUserIdOrSetError(req, res))) return;

  const tutorIds = parseUserIds(req.query.userIds);
  if (tutorIds.length === 0) {
    return res.status(200).json([]);
  }

  const placeholders = tutorIds.map(() => '?').join(',');
  const tutors = await executeAndEndSet500OnError(
    `
    SELECT
      userId,
      TRIM(CONCAT_WS(' ', firstName, lastName)) AS name,
      email
    FROM userInfo
    WHERE userId IN (${placeholders})
    `,
    tutorIds,
    res
  );
  if (!tutors) return;

  res.status(200).json(tutors);
}
