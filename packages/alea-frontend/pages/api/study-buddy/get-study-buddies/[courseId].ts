import { GetStudyBuddiesResponse, StudyBuddy } from '@alea/spec';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../../comment-utils';
import { getSbCourseId } from '../study-buddy-utils';

const SENT_STATUS = 'sent';
const RECEIVED_STATUS = 'received';
const CONNECTED_STATUS = 'connected';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const courseId = req.query.courseId as string;
  const sbCourseId = getSbCourseId(courseId);
  const receivedRequests: any[] = await executeAndEndSet500OnError(
    'SELECT senderId FROM StudyBuddyConnections WHERE receiverId=? AND sbCourseId=?',
    [userId, sbCourseId],
    res
  );

  if (!receivedRequests) return;

  const sentRequests: any[] = await executeAndEndSet500OnError(
    'SELECT receiverId FROM StudyBuddyConnections WHERE senderId=? AND sbCourseId=?',
    [userId, sbCourseId],
    res
  );

  if (!sentRequests) return;

  // TODO: should not select *
  const allStudybuddies: StudyBuddy[] = await executeAndEndSet500OnError(
    'SELECT * FROM StudyBuddyUsers WHERE NOT userId=? AND sbCourseId=? AND active=?',
    [userId, sbCourseId, true],
    res
  );

  if (!allStudybuddies) return;

  const userStatusses = new Map<string, string>();
  for (const row of receivedRequests) {
    userStatusses.set(row.senderId, RECEIVED_STATUS);
  }

  for (const row of sentRequests) {
    if (userStatusses.has(row.receiverId)) {
      userStatusses.set(row.receiverId, CONNECTED_STATUS);
    } else {
      userStatusses.set(row.receiverId, SENT_STATUS);
    }
  }

  const connected: StudyBuddy[] = [];
  const requestSent: StudyBuddy[] = [];
  const requestReceived: StudyBuddy[] = [];
  const other: StudyBuddy[] = [];

  for (const buddy of allStudybuddies) {
    const status = userStatusses.get(buddy.userId);
    if (status === CONNECTED_STATUS) {
      connected.push(buddy);
    } else {
      delete buddy.email;
      if (status === SENT_STATUS) {
        requestSent.push(buddy);
      } else if (status === RECEIVED_STATUS) {
        requestReceived.push(buddy);
      } else {
        other.push(buddy);
      }
    }
  }

  res.status(200).json({
    connected,
    requestSent,
    requestReceived,
    other,
  } as GetStudyBuddiesResponse);
}
