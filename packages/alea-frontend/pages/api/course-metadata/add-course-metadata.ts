import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { ResourceName, Action } from '@alea/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const {
    courseId,
    instanceId,
    universityId,
    courseName,
    notes,
    landing,
    slides,
    teaser,
    livestreamUrl,
    instructors,
  } = req.body;

  if (
    !courseId ||
    !instanceId ||
    !universityId ||
    !courseName ||
    !notes ||
    !landing ||
    !slides ||
    !instructors
  ) {
    return res.status(422).end('Missing required fields');
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
    `INSERT INTO courseMetadata (
  courseId, instanceId, lectureSchedule, tutorialSchedule, seriesId, hasHomework, hasQuiz,
  updaterId, universityId, courseName, notes, landing, slides, teaser, livestreamUrl,
  instructors
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
    [
      courseId,
      instanceId,
      JSON.stringify([]),
      JSON.stringify([]),
      null,
      false,
      false,
      updaterId,
      universityId,
      courseName,
      notes,
      landing,
      slides,
      teaser || null,
      (livestreamUrl ?? '').trim() || null,
      JSON.stringify(instructors),
    ],
    res
  );

  return res.status(201).end('Course metadata created successfully');
}
