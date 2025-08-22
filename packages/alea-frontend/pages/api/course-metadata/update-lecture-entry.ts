import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@stex-react/utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { executeQuery, checkIfPostOrSetError, getUserIdOrSetError } from '../comment-utils';

type LectureEntry = {
  lectureDay: string;
  venue?: string;
  venueLink?: string;
  lectureStartTime: string;
  lectureEndTime: string;
  hasHomework?: boolean;
  hasQuiz?: boolean;
};

type DatabaseResult<T> = T[] | { error: any };

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

  // const userId = await getUserIdIfAuthorizedOrSetError(
  //   req,
  //   res,
  //   ResourceName.COURSE_METADATA,
  //   Action.MUTATE,
  //   { courseId }
  // );
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  try {
    const existingResult = (await executeQuery<{ lectureSchedule: string }>(
      `SELECT lectureSchedule FROM courseMetadata WHERE courseId = ? AND instanceId = ?`,
      [courseId, instanceId]
    )) as DatabaseResult<{ lectureSchedule: string }>;

    if ('error' in existingResult) {
      return res.status(500).end('Database error');
    }

    if (!existingResult.length) {
      return res.status(404).end('Course instance not found');
    }

    let lectureSchedule: LectureEntry[];
    try {
      lectureSchedule = JSON.parse(existingResult[0].lectureSchedule || '[]');
    } catch {
      return res.status(500).end('Invalid lecture schedule JSON');
    }

    const lectureIndex = lectureSchedule.findIndex(
      (l) =>
        l.lectureDay === lectureDay &&
        l.lectureStartTime === lectureStartTime &&
        l.lectureEndTime === lectureEndTime
    );
    if (lectureIndex === -1) {
      return res
        .status(404)
        .end(`Lecture on ${lectureDay} ${lectureStartTime}-${lectureEndTime} not found`);
    }

    const mergedEntry: LectureEntry = {
      ...lectureSchedule[lectureIndex],
      ...updatedLectureEntry,
      lectureDay,
    };

    lectureSchedule[lectureIndex] = mergedEntry;

    const updateResult = (await executeQuery<{ affectedRows: number }>(
      `UPDATE courseMetadata
       SET lectureSchedule = ?, userId = ?
       WHERE courseId = ? AND instanceId = ?`,
      [JSON.stringify(lectureSchedule), userId, courseId, instanceId]
    )) as DatabaseResult<{ affectedRows: number }>;

    if ('error' in updateResult) {
      return res.status(500).end('Failed to update lecture schedule');
    }

    return res.status(200).end();
  } catch (error) {
    console.error('Error updating lecture entry:', error);
    return res.status(500).end('Internal server error');
  }
}
