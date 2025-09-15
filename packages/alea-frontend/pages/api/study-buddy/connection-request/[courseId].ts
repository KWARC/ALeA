import { NotificationType } from '@alea/spec';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserInfo,
  sendNotification,
} from '../../comment-utils';
import { getSbCourseId } from '../study-buddy-utils';
import { CURRENT_TERM } from '@alea/utils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!checkIfPostOrSetError(req, res)) return;
  const user = await getUserInfo(req);
  const userId = user?.userId;
  if (!userId) {
    res.status(403).send({ message: 'User info not available' });
    return;
  }
  const courseId = req.query.courseId as string;
  let instanceId = req.query.instanceId as string;
  if (!instanceId) instanceId = CURRENT_TERM;
  const sbCourseId = getSbCourseId(courseId, instanceId);

  const receiverId = req.body?.receiverId;

  if (!receiverId) {
    res.status(400).json({ message: `receiverId not found` });
    return;
  }

  const results = await executeAndEndSet500OnError(
    'INSERT INTO StudyBuddyConnections(senderId, receiverId, sbCourseId) VALUES (?, ?, ?)',
    [userId, receiverId, sbCourseId],
    res
  );

  if (!results) return;
  res.status(204).end();
  sendNotification(
    receiverId,
    `${user.fullName} would like to study together for the ${courseId} course.`,
    '',
    `${user.fullName} würde gerne gemeinsam für den ${courseId}-Kurs lernen.`,
    '',
    NotificationType.STUDY_BUDDY,
    `/study-buddy/${courseId}`
  );
}
