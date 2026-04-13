import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { courseId, instanceId } = req.query;

  if (!courseId || !instanceId) {
    res.status(422).end('Missing required fields');
    return;
  }

  const result = await executeAndEndSet500OnError(
    `SELECT lectureSchedule, tutorialSchedule, hasHomework, hasQuiz, seriesId, livestreamUrl FROM courseMetadata WHERE courseId = ? AND instanceId = ?`,
    [courseId, instanceId],
    res
  );

  if (!result?.length) {
    return res.status(404).end('No lecture schedule found');
  }

  let lectureSchedule: any[] = [];
  let tutorialSchedule: any[] = [];
  try {
    lectureSchedule = result[0].lectureSchedule ? result[0].lectureSchedule : [];
    tutorialSchedule = result[0].tutorialSchedule ? result[0].tutorialSchedule : [];
  } catch {
    return res.status(500).end('Failed to parse lecture schedule JSON');
  }

  const hasHomework = !!(result[0].hasHomework ?? false);
  const hasQuiz = !!(result[0].hasQuiz ?? false);
  const livestreamUrl = result[0].livestreamUrl ?? null;
  res.status(200).json({
    courseId,
    instanceId,
    lectureSchedule,
    tutorialSchedule,
    hasHomework,
    hasQuiz,
    seriesId: result[0].seriesId,
    livestreamUrl,
  });
}
