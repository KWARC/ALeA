import { NextApiRequest, NextApiResponse } from 'next';
import {
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { EnrolledCourseIds } from '@alea/spec';
import { getCurrentTermForCourseId } from '../get-current-term';
import { getCourseIdAndInstanceFromSbCourseId } from './study-buddy-utils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  let instanceId = req.query.instanceId as string;
  if (!instanceId) instanceId = await getCurrentTermForCourseId(req.query.courseId as string);

  const results: any[] = await executeAndEndSet500OnError(
    `SELECT sbCourseId, active as activeStatus from StudyBuddyUsers 
    WHERE sbCourseId LIKE '%${instanceId}' AND userId=?`,
    [userId],
    res
  );
  const enrolledCourseIds: EnrolledCourseIds[] = results.map((r) => ({
    courseId: getCourseIdAndInstanceFromSbCourseId(r.sbCourseId).courseId,
    activeStatus: r.activeStatus,
  }));

  res.status(200).json(enrolledCourseIds);
}
