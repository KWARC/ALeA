import { HomeworkInfo, UpdateHomeworkRequest } from '@alea/spec';
import { Action, ResourceName } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeDontEndSet500OnError,
} from '../comment-utils';

export type DbHomeworkInfo = HomeworkInfo & {
  versionNo: number;
  updaterId: string;

  updatedBy: Date;
  createdAt: Date;
};

export async function getHomeworkUsingIdOrSetError(
  id: number,
  res: NextApiResponse
): Promise<DbHomeworkInfo | undefined> {
  const results = await executeDontEndSet500OnError(
    'SELECT * FROM homework WHERE id = ?',
    [id],
    res
  );
  if (!results) return;
  const currentHomework = results[0];
  if (!currentHomework) res.status(404).send('homework not found');
  return currentHomework;
}

export async function updateHomeworkHistoryOrSetError(
  currentHomework: DbHomeworkInfo,
  res: NextApiResponse
) {
  const insertHistoryResult = await executeDontEndSet500OnError(
    'INSERT INTO homeworkHistory (id, versionNo, title, givenTs, dueTs, feedbackReleaseTs, courseId, courseInstance, institutionId, problems, updaterId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      currentHomework.id,
      currentHomework.versionNo,
      currentHomework.title,
      currentHomework.givenTs,
      currentHomework.dueTs,
      currentHomework.feedbackReleaseTs,
      currentHomework.courseId,
      currentHomework.courseInstance,
      currentHomework.institutionId,
      currentHomework.problems,
      currentHomework.updaterId,
      currentHomework.createdAt,
    ],
    res
  );
  return insertHistoryResult;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { id, title, givenTs, dueTs, feedbackReleaseTs, css, problems } =
    req.body as UpdateHomeworkRequest;
  if (!id) return res.status(400).send('homework id is missing');

  const currentHomework = await getHomeworkUsingIdOrSetError(id, res);
  if (!currentHomework) return res.status(404).send('homework not found');
  const { courseId, courseInstance } = currentHomework;

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_HOMEWORK,
    Action.MUTATE,
    { courseId, instanceId: courseInstance }
  );
  if (!userId) return;

  const insertHistoryResult = await updateHomeworkHistoryOrSetError(currentHomework, res);
  if (!insertHistoryResult) return;

  const newVersionNo = currentHomework.versionNo + 1;
  const result = await executeAndEndSet500OnError(
    'UPDATE homework SET versionNo = ?, title = ?, givenTs = ?, dueTs = ?, feedbackReleaseTs=?, css = ?, problems = ? WHERE id = ?',
    [
      newVersionNo,
      title,
      givenTs,
      dueTs,
      feedbackReleaseTs,
      JSON.stringify(css),
      JSON.stringify(problems),
      id,
    ],
    res
  );
  if (!result) return;

  res.status(200).end();
}
