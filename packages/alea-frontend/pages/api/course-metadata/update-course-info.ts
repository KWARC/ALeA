import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { ResourceName, Action } from '@alea/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const {
    courseId,
    instanceId,
    courseName,
    notes,
    landing,
    slides,
    institution,
    teaser,
    instructors,
    isCurrent,
  } = req.body;

  if (!courseId || !instanceId) {
    return res.status(422).end('Missing courseId or instanceId');
  }

  for (const inst of instructors) {
    if (!inst.id || !inst.name) {
      return res.status(422).end('Instructor id and name required');
    }
  }

  const updaterId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_METADATA,
    Action.MUTATE,
    { courseId, instanceId }
  );
  if (!updaterId) return;

  await executeAndEndSet500OnError(
    `UPDATE courseMetadata
     SET
       courseName = COALESCE(?, courseName),
       notes = COALESCE(?, notes),
       landing = COALESCE(?, landing),
       slides = COALESCE(?, slides),
       institution = COALESCE(?, institution),
       teaser = COALESCE(?, teaser),
       instructors = COALESCE(?, instructors),
       isCurrent = COALESCE(?, isCurrent),
       updaterId = ?,
       updatedAt = CURRENT_TIMESTAMP
     WHERE courseId = ? AND instanceId = ?`,
    [
      courseName,
      notes,
      landing,
      slides,
      institution,
      teaser,
      instructors ? JSON.stringify(instructors) : null,
      isCurrent,
      updaterId,
      courseId,
      instanceId,
    ],
    res
  );

  return res.status(200).end('Course info updated successfully');
}
