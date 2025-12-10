import { Action, ResourceName } from '@alea/utils';
import { getCurrentTermForCourseId } from '../get-current-term';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { quizId, userId, courseId } = req.body;
  let courseInstance = req.body.courseInstance as string;
  if (!courseInstance) courseInstance = await getCurrentTermForCourseId(courseId);
  if (!quizId || !userId || !courseId || !courseInstance) {
    return res
      .status(422)
      .send('Missing required fields: quizId, userId, courseId, or courseInstance.');
  }
  const instructorId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_QUIZ,
    Action.MUTATE,
    { courseId, instanceId: courseInstance }
  );
  if (!instructorId) return;

  const checkQuery = 'SELECT 1 FROM excused WHERE userId = ? AND quizId = ? LIMIT 1';
  const checkResult = await executeAndEndSet500OnError(checkQuery, [userId, quizId], res);
  if (!checkResult) return res.status(500).send('Failed to check existing excused entries.');
  if (Array.isArray(checkResult) && checkResult.length > 0) {
    return res.status(409).send('Student is already excused for this quiz.');
  }

  const query =
    'INSERT INTO excused (userId, quizId, courseId, courseInstance) VALUES (?, ?, ?, ?)';
  const result = await executeAndEndSet500OnError(
    query,
    [userId, quizId, courseId, courseInstance],
    res
  );
  if (!result) return;
  res.status(200).end();
}
