import { NextApiRequest, NextApiResponse } from 'next';
import {
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../../comment-utils';
import { StudyBuddy } from '@alea/spec';
import { getSbCourseId } from '../study-buddy-utils';
import { getCurrentTermForCourseId } from '../../get-current-term';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  let instanceId = req.query.instanceId as string;
  if (!instanceId) instanceId = await getCurrentTermForCourseId(req.query.courseId as string);

  const courseId = req.query.courseId as string;
  const sbCourseId = await getSbCourseId(courseId, instanceId);
  // TODO: should not select *
  const results: any[] = await executeAndEndSet500OnError(
    'SELECT * FROM StudyBuddyUsers WHERE userId=? AND sbCourseId=?',
    [userId, sbCourseId],
    res
  );

  if (!results) return;
  if (results.length === 0) {
    res.status(404).end();
    return;
  }

  res.status(200).json(results[0] as StudyBuddy);
}
