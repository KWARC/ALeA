import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@stex-react/utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';

type LectureEntry = {
  lectureDay: string;
  venue?: string;
  venueLink?: string;
  lectureStartTime: string;
  lectureEndTime: string;
  hasHomework?: boolean;
  hasQuiz?: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const {
    courseId,
    instanceId,
    lectureDay,
    lectureStartTime,
    lectureEndTime,
    updatedLectureEntry,
  } = req.body as {
    courseId: string;
    instanceId: string;
    lectureDay: string;
    lectureStartTime: string;
    lectureEndTime: string;
    updatedLectureEntry: Partial<LectureEntry>;
  };

  if (
    !courseId ||
    !instanceId ||
    !lectureDay ||
    !lectureStartTime ||
    !lectureEndTime ||
    !updatedLectureEntry
  ) {
    return res.status(400).end('Missing required fields');
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
  if (!existing?.length) return res.status(404).end('Course instance not found');

  let lectureSchedule: LectureEntry[] = [];
  try {
    lectureSchedule = JSON.parse(existing[0].lectureSchedule || '[]');
  } catch {
    return res.status(500).end('Invalid lecture schedule JSON');
  }

  const idx = lectureSchedule.findIndex(
    (l) =>
      l.lectureDay === lectureDay &&
      l.lectureStartTime === lectureStartTime &&
      l.lectureEndTime === lectureEndTime
  );
  if (idx === -1) {
    return res.status(404).end('Lecture not found');
  }

  lectureSchedule[idx] = { ...lectureSchedule[idx], ...updatedLectureEntry };

  await executeAndEndSet500OnError(
    `UPDATE courseMetaData
     SET lectureSchedule = ?, userId = ?, updatedAt = CURRENT_TIMESTAMP
     WHERE courseId = ? AND instanceId = ?`,
    [JSON.stringify(lectureSchedule), userId, courseId, instanceId],
    res
  );

  return res.status(200).end();
}
