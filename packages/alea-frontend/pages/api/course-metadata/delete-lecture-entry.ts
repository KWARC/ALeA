import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { ResourceName, Action } from '@alea/utils';
import { LectureSchedule } from '@alea/spec';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { courseId, instanceId, lectureEntry, scheduleType } = req.body;

  if (!courseId || !instanceId || !lectureEntry || !scheduleType) {
    return res.status(422).send('Missing required fields');
  }

  const updaterId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_METADATA,
    Action.MUTATE,
    { courseId, instanceId }
  );
  if (!updaterId) return;

  const fieldName = scheduleType === 'tutorial' ? 'tutorialSchedule' : 'lectureSchedule';

  const result = await executeAndEndSet500OnError(
    `SELECT ${fieldName}
     FROM courseMetadata
     WHERE courseId = ? AND instanceId = ? AND updaterId = ?`,
    [courseId, instanceId, updaterId],
    res
  );

  if (!result?.length || !result[0][fieldName]) {
    return res.status(404).end(`No ${scheduleType} schedule found`);
  }

  let schedule: LectureSchedule[];
  try {
    schedule = JSON.parse(result[0][fieldName] || '[]');
  } catch {
    return res.status(500).end('Failed to parse schedule JSON');
  }

  const filtered = schedule.filter(
    (entry) =>
      !(
        entry.lectureDay === lectureEntry.lectureDay &&
        entry.lectureStartTime === lectureEntry.lectureStartTime &&
        entry.lectureEndTime === lectureEntry.lectureEndTime &&
        entry.venue === lectureEntry.venue &&
        entry.venueLink === lectureEntry.venueLink &&
        entry.hasQuiz === lectureEntry.hasQuiz
      )
  );

  const updateResult = await executeAndEndSet500OnError(
    `UPDATE courseMetadata
     SET ${fieldName} = ?, updatedAt = CURRENT_TIMESTAMP
     WHERE courseId = ? AND instanceId = ? AND updaterId = ?`,
    [JSON.stringify(filtered), courseId, instanceId, updaterId],
    res
  );
  if (!updateResult) return;

  res.status(200).end(`${scheduleType} entry deleted successfully`);
}
