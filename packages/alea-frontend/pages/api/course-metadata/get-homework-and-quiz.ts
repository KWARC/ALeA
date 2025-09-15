import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { courseId, instanceId } = req.query;

  if (!courseId) {
    res.status(422).end('Missing required fields');
    return;
  }

  const result = await executeAndEndSet500OnError(
    `SELECT hasQuiz, hasHomework FROM courseMetadata WHERE courseId = ? AND instanceId = ?`,
    [courseId, instanceId],
    res
  );

  if (!result?.length) {
    return res.status(200).json({ hasQuiz: false, hasHomework: false });
  }

  const hasQuiz = !!(result[0].hasQuiz ?? false);
  const hasHomework = !!(result[0].hasHomework ?? false);
  res.status(200).json({ hasQuiz, hasHomework });
}