import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { ResourceName, Action } from '@stex-react/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { courseId, instanceId, lectureEntry } = req.body;

  if (
    !courseId ||
    !instanceId ||
    !lectureEntry ||
    !lectureEntry.lectureDay ||
    !lectureEntry.lectureStartTime ||
    !lectureEntry.lectureEndTime
  ) {
    res.status(422).send('Missing required fields');
    return;
  }

  // const userId = await getUserIdIfAuthorizedOrSetError(
  //   req,
  //   res,
  //   ResourceName.COURSE_METADATA,
  //   Action.MUTATE,
  //   { courseId, instanceId }
  // );
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const lectureSchedule = JSON.stringify(lectureEntry);

  const result = await executeAndEndSet500OnError(
    `INSERT INTO coursemetadata (courseId, instanceId, lectureSchedule, userId) VALUES (?, ?, ?, ?)`,
    [courseId, instanceId, lectureSchedule, userId],
    res
  );
  if (!result) return;

  res.status(201).end();
}
