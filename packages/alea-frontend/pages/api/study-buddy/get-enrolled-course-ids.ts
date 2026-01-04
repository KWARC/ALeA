import { NextApiRequest, NextApiResponse } from 'next';
import {
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { EnrolledCourseIds } from '@alea/spec';
import { getCurrentTermForCourseId } from '../get-current-term';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const instanceId = req.query.instanceId as string;
  const institutionId = req.query.institutionId as string;

  if (!institutionId) {
    res.status(422).end('Missing required field: institutionId');
    return;
  }

  const results: any[] = await executeAndEndSet500OnError(
    `SELECT courseId, active as activeStatus from StudyBuddyUsers 
    WHERE instanceId = ? AND institutionId = ? AND userId=?`,
    [instanceId, institutionId, userId],
    res
  );
  const enrolledCourseIds: EnrolledCourseIds[] = results.map((r) => ({
    courseId: r.courseId,
    activeStatus: r.activeStatus,
  }));

  res.status(200).json(enrolledCourseIds);
}
