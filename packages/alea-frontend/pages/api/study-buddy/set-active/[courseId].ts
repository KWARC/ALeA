import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../../comment-utils';
import { getSbCourseId } from '../study-buddy-utils';
import { getCurrentTermForCourseId } from '../../get-current-term';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const courseId = req.query.courseId as string;
  let instanceId = req.query.instanceId as string;
  if (!instanceId) instanceId = await getCurrentTermForCourseId(courseId);
  const sbCourseId = await getSbCourseId(courseId, instanceId);
  const { active } = req.body;
  if (active === undefined) return res.status(400).send('Missing [active]');

  const results = await executeAndEndSet500OnError(
    'UPDATE StudyBuddyUsers SET active=? WHERE userId=? AND sbCourseId=?',
    [active, userId, sbCourseId],
    res
  );

  if (!results) return;
  res.status(204).end();
}
