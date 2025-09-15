import { CURRENT_TERM } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeDontEndSet500OnError } from '../comment-utils';
import { HomeworkInfo } from '@alea/spec';

export async function getAllHomeworksOrSetError(
  courseId: string,
  courseInstance: string,
  getProblems: boolean,
  res: NextApiResponse
) {
  const homeworks: any[] = await executeDontEndSet500OnError(
    `SELECT id, title, givenTs, dueTs, feedbackReleaseTs, courseId, courseInstance ${
      getProblems ? ', problems' : ''
    }
    FROM homework 
    WHERE courseId = ? AND courseInstance = ?`,
    [courseId, courseInstance],
    res
  );
  if (!homeworks) return;
  homeworks.sort((a, b) => a.dueTs - b.dueTs);
  if (getProblems) {
    for (const homework of homeworks) {
      homework.problems = JSON.parse(homework.problems);
    }
  }
  return getProblems
    ? (homeworks as HomeworkInfo[])
    : (homeworks as Omit<HomeworkInfo, 'problems'>[]);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const courseId = req.query.courseId as string;
  if (!courseId) return res.status(422).send('Missing params.');
  const instanceId = (req.query.courseInstance as string) ?? CURRENT_TERM;

  const homeworks = await getAllHomeworksOrSetError(courseId, instanceId, false, res);
  if (!homeworks) return;

  res.status(200).json(homeworks);
}
