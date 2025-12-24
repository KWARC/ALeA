import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@alea/utils';
import { getUserIdIfAuthorizedOrSetError } from '../../access-control/resource-utils';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { universityId, instanceId, courseId } = req.body;

  if (!universityId || !instanceId || !courseId) {
    return res.status(422).end('Missing required fields: universityId, instanceId, courseId');
  }

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.UNIVERSITY_SEMESTER_DATA,
    Action.MUTATE,
    { universityId }
  );
  if (!userId) return;

  const existing = await executeAndEndSet500OnError(
    `SELECT 1 FROM courseMetadata WHERE courseId = ? AND instanceId = ?`,
    [courseId, instanceId],
    res
  );

  if (!existing) return;

  if (Array.isArray(existing) && existing.length > 0) {
    return res.status(200).json({ message: 'Course already exists for this semester' });
  }

  const alreadyExistCourseIdRow = await executeAndEndSet500OnError(
    `SELECT courseName, notes, landing, slides, teaser
     FROM courseMetadata
     WHERE courseId = ? AND universityId = ?
     LIMIT 1`,
    [courseId, universityId],
    res
  );
  if (!alreadyExistCourseIdRow) return;

  let courseName = '';
  let notes = '';
  let landing = '';
  let slides = '';
  let teaser: string | null = null;

  if (Array.isArray(alreadyExistCourseIdRow) && alreadyExistCourseIdRow.length > 0) {
    const template = alreadyExistCourseIdRow[0] as any;
    courseName = template?.courseName || courseName;
    notes = template?.notes || notes;
    landing = template?.landing || landing;
    slides = template?.slides || slides;
    teaser = template?.teaser ?? teaser;
  }


  const insertResult = await executeAndEndSet500OnError(
    `INSERT INTO courseMetadata (
      courseId,
      instanceId,
      universityId,
      lectureSchedule,
      tutorialSchedule,
      seriesId,
      hasHomework,
      hasQuiz,
      updaterId,
      courseName,
      notes,
      landing,
      slides,
      teaser,
      instructors
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      courseId,
      instanceId,
      universityId,
      JSON.stringify([]),
      JSON.stringify([]),
      null,
      false,
      false,
      userId,
      courseName,
      notes,
      landing,
      slides,
      teaser,
      JSON.stringify([]),
    ],
    res
  );

  if (!insertResult) return;

  return res.status(201).end();
}
