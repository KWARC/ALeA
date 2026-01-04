import { GetStudyBuddiesResponse, StudyBuddy } from '@alea/spec';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../../comment-utils';
import { getCurrentTermForCourseId } from '../../get-current-term';

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
  const instanceId = req.query.instanceId as string;
  const institutionId = req.query.institutionId as string;

  if (!institutionId) {
    res.status(422).end('Missing required field: institutionId');
    return;
  }
  
  const receivedRequests: any[] = await executeAndEndSet500OnError(
    'SELECT senderId FROM StudyBuddyConnections WHERE receiverId=? AND courseId=? AND instanceId=? AND institutionId=?',
    [userId, courseId, instanceId, institutionId],
    res
  );

  if (!receivedRequests) return;

  const sentRequests: any[] = await executeAndEndSet500OnError(
    'SELECT receiverId FROM StudyBuddyConnections WHERE senderId=? AND courseId=? AND instanceId=? AND institutionId=?',
    [userId, courseId, instanceId, institutionId],
    res
  );

  if (!sentRequests) return;

  // TODO: should not select *
  const allStudybuddies: StudyBuddy[] = await executeAndEndSet500OnError(
    'SELECT * FROM StudyBuddyUsers WHERE NOT userId=? AND courseId=? AND instanceId=? AND institutionId=? AND active=?',
    [userId, courseId, instanceId, institutionId, true],
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
