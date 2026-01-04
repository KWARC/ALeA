import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../../comment-utils';
import { getCurrentTermForCourseId } from '../../get-current-term';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const courseId = req.query.courseId as string;
  const instanceId = req.query.instanceId as string;
  const institutionId = req.query.institutionId as string;

  if (!institutionId) {
    res.status(422).end('Missing required field: institutionId');
    return;
  }

  const { active } = req.body;
  if (active === undefined) return res.status(400).send('Missing [active]');

  const results = await executeAndEndSet500OnError(
    'UPDATE StudyBuddyUsers SET active=? WHERE userId=? AND courseId=? AND instanceId=? AND institutionId=?',
    [active, userId, courseId, instanceId, institutionId],
    res
  );

  if (!results) return;
  res.status(204).end();
}
