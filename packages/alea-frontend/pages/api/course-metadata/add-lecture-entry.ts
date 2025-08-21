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

  const existing = await executeAndEndSet500OnError(
    `SELECT lectureSchedule FROM courseMetaData WHERE courseId = ? AND instanceId = ?`,
    [courseId, instanceId],
    res
  );

  let lectureSchedule: any[] = [];
  if (existing?.length && existing[0].lectureSchedule) {
    try {
      lectureSchedule = JSON.parse(existing[0].lectureSchedule);
    } catch {
      lectureSchedule = [];
    }
  }

  lectureSchedule.push(lectureEntry);

  await executeAndEndSet500OnError(
    `INSERT INTO courseMetaData (courseId, instanceId, lectureSchedule, userId)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE lectureSchedule = VALUES(lectureSchedule), updatedAt = CURRENT_TIMESTAMP`,
    [courseId, instanceId, JSON.stringify(lectureSchedule), userId],
    res
  );

  res.status(201).end();
}
