import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const { courseId, instanceId } = req.query;

  if (!courseId || !instanceId) {
    res.status(422).end('Missing required fields');
    return;
  }

  const lectureSchedule = await executeAndEndSet500OnError(
    `SELECT lectureDay, venue, venueLink, lectureStartTime, lectureEndTime, hasHomework, hasQuiz
     FROM lecture_schedule
     WHERE courseId = ? AND instanceId = ?
     ORDER BY lectureDay, lectureStartTime`,
    [courseId, instanceId],
    res
  );

  if (!lectureSchedule) return;

  res.status(200).json({ courseId, instanceId, lectureSchedule });
}
