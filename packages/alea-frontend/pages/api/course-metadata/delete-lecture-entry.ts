import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { ResourceName, Action } from '@stex-react/utils';
import { LectureSchedule  } from '@stex-react/spec';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { courseId, instanceId, lectureEntry } = req.body;

  if (!courseId || !instanceId || !lectureEntry) {
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

  const result = await executeAndEndSet500OnError(
    `SELECT lectureSchedule
     FROM courseMetadata
     WHERE updaterId = ? AND courseId = ? AND instanceId = ?`,
    [updaterId, courseId, instanceId],
    res
  );

  if (!result?.length || !result[0].lectureSchedule) {
    return res.status(404).end('No lecture schedule found for the specified course and instance');
  }

  let lectureSchedule: LectureSchedule [];
  try {
    lectureSchedule = JSON.parse(result[0].lectureSchedule);
  } catch {
    return res.status(500).end('Failed to parse lecture schedule JSON');
  }

  const filtered = lectureSchedule.filter((entry) => {
    return !(
      entry.lectureDay === lectureEntry.lectureDay &&
      entry.lectureStartTime === lectureEntry.lectureStartTime &&
      entry.lectureEndTime === lectureEntry.lectureEndTime &&
      entry.venue === lectureEntry.venue &&
      entry.venueLink === lectureEntry.venueLink &&
      entry.hasQuiz === lectureEntry.hasQuiz
    );
  });

  const updateResult = await executeAndEndSet500OnError(
    `UPDATE courseMetadata
     SET lectureSchedule = ?, updatedAt = CURRENT_TIMESTAMP
     WHERE courseId = ? AND instanceId = ? AND updaterId = ?`,
    [JSON.stringify(filtered), courseId, instanceId, updaterId],
    res
  );
  if (!updateResult) return;

  res.status(200).end('Lecture entry deleted successfully');
}
