import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { ResourceName, Action } from '@alea/utils';
import { AddLectureScheduleRequest } from '@alea/spec';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { courseId, instanceId, lectureEntry, scheduleType } =
    req.body as AddLectureScheduleRequest;

  if (
    !courseId ||
    !instanceId ||
    !lectureEntry ||
    !lectureEntry.lectureDay ||
    !lectureEntry.lectureStartTime ||
    !lectureEntry.lectureEndTime ||
    !scheduleType
  ) {
    res.status(422).send('Missing required fields');
    return;
  }

  const updaterId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_METADATA,
    Action.MUTATE,
    { courseId, instanceId }
  );
  if (!updaterId) return;

  const scheduleColumn = scheduleType === 'lecture' ? 'lectureSchedule' : 'tutorialSchedule';

  const existing = await executeAndEndSet500OnError(
    `SELECT ${scheduleColumn} FROM courseMetadata WHERE courseId = ? AND instanceId = ?`,
    [courseId, instanceId],
    res
  );

  let scheduleData: any[] = [];
  if (existing?.length && existing[0][scheduleColumn]) {
    try {
      scheduleData = JSON.parse(existing[0][scheduleColumn]);
    } catch {
      scheduleData = [];
    }
  }

  const idx = scheduleData.findIndex(
    (e) =>
      e.lectureDay === lectureEntry.lectureDay &&
      e.lectureStartTime === lectureEntry.lectureStartTime &&
      e.lectureEndTime === lectureEntry.lectureEndTime &&
      (e.venue || '') === (lectureEntry.venue || '')
  );

  if (idx >= 0) {
    scheduleData[idx] = { ...scheduleData[idx], ...lectureEntry };
  } else {
    scheduleData.push(lectureEntry);
  }

  if (existing?.length) {
    await executeAndEndSet500OnError(
      `UPDATE courseMetadata
       SET ${scheduleColumn} = ?, updaterId = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE courseId = ? AND instanceId = ?`,
      [JSON.stringify(scheduleData), updaterId, courseId, instanceId],
      res
    );
  } else {
    await executeAndEndSet500OnError(
      `INSERT INTO courseMetadata (courseId, instanceId, ${scheduleColumn}, updaterId)
       VALUES (?, ?, ?, ?)`,
      [courseId, instanceId, JSON.stringify(scheduleData), updaterId],
      res
    );
  }

  res.status(201).end();
}
