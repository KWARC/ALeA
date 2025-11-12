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
    instances,
    instructors,
    isCurrent,
  } = req.body;

  if (
    !courseId ||
    !instanceId ||
    !courseName ||
    !notes ||
    !landing ||
    !slides ||
    !instances ||
    !instructors
  ) {
    return res.status(422).end('Missing required fields');
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
      updaterId, courseName, notes, landing, slides, institution, teaser,
      instances, instructors, isCurrent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      courseId,
      instanceId,
      JSON.stringify([]),
      JSON.stringify([]),
      null,
      false,
      false,
      updaterId,
      courseName,
      notes,
      landing,
      slides,
      institution || null,
      teaser || null,
      JSON.stringify(instances),
      JSON.stringify(instructors),
      isCurrent || false,
    ],
    res
  );

  return res.status(201).end('Course metadata created successfully');
}
