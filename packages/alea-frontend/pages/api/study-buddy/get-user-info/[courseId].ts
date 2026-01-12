import { NextApiRequest, NextApiResponse } from 'next';
import {
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../../comment-utils';
import { StudyBuddy } from '@alea/spec';
import { getCurrentTermForCourseId } from '../../get-current-term';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const instanceId = req.query.instanceId as string;

  const courseId = req.query.courseId as string;
  const institutionId = req.query.institutionId as string;

  if (!institutionId || !courseId || !instanceId) {
    res.status(422).end('Missing required field: institutionId or courseId or instanceId');
    return;
  }

  // TODO: should not select *
  const results: any[] = await executeAndEndSet500OnError(
    'SELECT * FROM StudyBuddyUsers WHERE userId=? AND courseId=? AND instanceId=? AND institutionId=?',
    [userId, courseId, instanceId, institutionId],
    res
  );

  if (!results) return;
  if (results.length === 0) {
    res.status(404).end();
    return;
  }

  res.status(200).json(results[0] as StudyBuddy);
}
