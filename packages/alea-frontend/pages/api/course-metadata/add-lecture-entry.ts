import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
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

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_METADATA,
    Action.MUTATE,
    { courseId, instanceId }
  );

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

  const idx = lectureSchedule.findIndex(
    (e) =>
      e.lectureDay === lectureEntry.lectureDay &&
      e.lectureStartTime === lectureEntry.lectureStartTime &&
      e.lectureEndTime === lectureEntry.lectureEndTime &&
      (e.venue || '') === (lectureEntry.venue || '')
  );

  if (idx >= 0) {
    lectureSchedule[idx] = { ...lectureSchedule[idx], ...lectureEntry };
  } else {
    lectureSchedule.push(lectureEntry);
  }

  if (existing?.length) {
    await executeAndEndSet500OnError(
      `UPDATE courseMetaData
       SET lectureSchedule = ?, userId = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE courseId = ? AND instanceId = ?`,
      [JSON.stringify(lectureSchedule), userId, courseId, instanceId],
      res
    );
  } else {
    await executeAndEndSet500OnError(
      `INSERT INTO courseMetaData (courseId, instanceId, lectureSchedule, userId)
       VALUES (?, ?, ?, ?)`,
      [courseId, instanceId, JSON.stringify(lectureSchedule), userId],
      res
    );
  }

  res.status(201).end();
}
