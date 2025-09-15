import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@alea/utils';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { courseId, instanceId, hasQuiz} = req.body as {
    courseId: string;
    instanceId: string;
    hasQuiz: boolean;
  };

  if (!courseId || !instanceId || typeof hasQuiz !== 'boolean') {
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

  const existing = await executeAndEndSet500OnError(
    `SELECT courseId FROM courseMetadata WHERE courseId = ? AND instanceId = ?`,
    [courseId, instanceId],
    res
  );

  if (!existing?.length) {
    await executeAndEndSet500OnError(
      `INSERT INTO courseMetadata (courseId, instanceId, lectureSchedule, hasQuiz, hasHomework, updaterId)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [courseId, instanceId, JSON.stringify([]), hasQuiz ? 1 : 0, 0, updaterId],
      res
    );
    return res.status(201).end();
  }

  await executeAndEndSet500OnError(
    `UPDATE courseMetadata
     SET hasQuiz = ?, updaterId = ?, updatedAt = CURRENT_TIMESTAMP
     WHERE courseId = ? AND instanceId = ?`,
    [hasQuiz ? 1 : 0, updaterId, courseId, instanceId],
    res
  );

  return res.status(200).end();
}

