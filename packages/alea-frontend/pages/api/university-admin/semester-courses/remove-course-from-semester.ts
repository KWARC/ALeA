import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@alea/utils';
import { getUserIdIfAuthorizedOrSetError } from '../../access-control/resource-utils';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeDontEndSet500OnError,
} from '../../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { universityId, instanceId, courseId, confirmedCourseId } = req.body;

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

  const courseMetadata = await executeDontEndSet500OnError(
    `SELECT notes FROM courseMetadata WHERE courseId = ? AND instanceId = ?`,
    [courseId, instanceId],
    res
  );
  if (!courseMetadata) return;

  if (Array.isArray(courseMetadata) && courseMetadata.length > 0) {
    const notes = courseMetadata[0]?.notes;
    if (notes && notes.trim() !== '') {
      if (!confirmedCourseId || confirmedCourseId.trim() !== courseId.trim()) {
        return res.status(400).json({
          message:
            'Cannot delete course: Notes are present. Please remove notes first before deleting the course.',
        });
      }
    }
  }

  const deleteResult = await executeAndEndSet500OnError(
    `DELETE FROM courseMetadata WHERE courseId = ? AND instanceId = ?`,
    [courseId, instanceId],
    res
  );

  if (!deleteResult) return;

  res.status(200).json({ message: 'Course removed from semester successfully' });
}
