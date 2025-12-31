import { UserStats } from '@alea/spec';
import { getCurrentTermForCourseId } from '../../get-current-term';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfCanModerateStudyBuddyOrSetError } from '../../access-control/resource-utils';
import { executeAndEndSet500OnError } from '../../comment-utils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const courseId = req.query.courseId as string;
  let instanceId = req.query.instanceId as string;
  if (!instanceId) instanceId = await getCurrentTermForCourseId(courseId);
  const institutionId = req.query.institutionId as string;

  if (!institutionId) {
    res.status(422).end('Missing required field: institutionId');
    return;
  }

  const userId = await getUserIdIfCanModerateStudyBuddyOrSetError(req, res, courseId, instanceId);
  if (!userId) return;
  
  const result1: any[] = await executeAndEndSet500OnError(
    `SELECT 
      COUNT(userId) as TotalUsers, 
      SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as ActiveUsers,
      SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END) as InactiveUsers 
    FROM StudyBuddyUsers WHERE courseId = ? AND instanceId = ? AND institutionId = ?`,
    [courseId, instanceId, institutionId],
    res
  );
  const result2: any[] = await executeAndEndSet500OnError(
    `SELECT ROUND(COUNT(*) / 2) AS NumberOfConnections
    FROM StudyBuddyConnections as t1
    WHERE t1.courseId = ? AND t1.instanceId = ? AND t1.institutionId = ?
    AND EXISTS (
      SELECT 1 FROM StudyBuddyConnections as t2 
      WHERE t2.courseId = ? AND t2.instanceId = ? AND t2.institutionId = ?
      AND t1.senderId = t2.receiverId AND t1.receiverId = t2.senderId
    )`,
    [courseId, instanceId, institutionId, courseId, instanceId, institutionId],
    res
  );
  const result3: any[] = await executeAndEndSet500OnError(
    `SELECT COUNT(*) as TotalRequests FROM StudyBuddyConnections WHERE courseId=? AND instanceId=? AND institutionId=?`,
    [courseId, instanceId, institutionId],
    res
  );

  const connections: any[] = await executeAndEndSet500OnError(
    `SELECT senderId , receiverId FROM StudyBuddyConnections WHERE courseId=? AND instanceId=? AND institutionId=? ORDER BY timeOfIssue ASC`,
    [courseId, instanceId, institutionId],
    res
  );

  const userIdsAndActiveStatus: any[] = await executeAndEndSet500OnError(
    `SELECT userId , active as activeStatus FROM StudyBuddyUsers WHERE courseId=? AND instanceId=? AND institutionId=?`,
    [courseId, instanceId, institutionId],
    res
  );

  if (
    !result1 ||
    !result2 ||
    !result3 ||
    !connections ||
    !userIdsAndActiveStatus
  )
    return;

  const userIdToAnonymousId = new Map<string, string>();
  userIdsAndActiveStatus
    .sort(() => 0.5 - Math.random())
    .forEach((item, index) => {
      userIdToAnonymousId.set(item.userId, index.toString());
      item.userId = index.toString();
    });

  const anonymousConnections = connections.map((item) => ({
    senderId: userIdToAnonymousId.get(item.senderId),
    receiverId: userIdToAnonymousId.get(item.receiverId),
  }));

  const combinedResults: UserStats = {
    totalUsers: result1[0].TotalUsers,
    activeUsers: result1[0].ActiveUsers,
    inactiveUsers: result1[0].InactiveUsers,
    numberOfConnections: result2[0].NumberOfConnections,
    unacceptedRequests:
      result3[0].TotalRequests - result2[0].NumberOfConnections * 2,
    connections: anonymousConnections,
    userIdsAndActiveStatus,
  };
  res.status(200).json(combinedResults);
}
