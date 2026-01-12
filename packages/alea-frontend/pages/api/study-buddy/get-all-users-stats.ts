import { AllCoursesStats } from '@alea/spec';
import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfCanModerateStudyBuddyOrSetError } from '../access-control/resource-utils';
import { getCurrentTermForCourseId } from '../get-current-term';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdIfCanModerateStudyBuddyOrSetError(req, res);
  if (!userId) return;
  const instanceId = req.query.instanceId as string;
  const institutionId = req.query.institutionId as string;

  if (!institutionId) {
    res.status(422).end('Missing required field: institutionId');
    return;
  }
  /*
    This query counts a user multiple times if the user registered in multiple courses.
    The reasons of this action 
        The sum of all the course's stats should be equal to this number.
        If change the query to remove duplicate people from the count, It is possible to find a person had been registered in many courses. I thought this can break the users' privacy.
        A user always fills all the form input In study body for every course, so technically he/ she is a sprat user.
    */
  const result1: any[] = await executeAndEndSet500OnError(
    `
    SELECT 
      COUNT(userId) as TotalUsers, 
      SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as ActiveUsers,
      SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END) as InactiveUsers 
    FROM StudyBuddyUsers
    WHERE instanceId = ? AND institutionId = ?`,
    [instanceId, institutionId],
    res
  );
  const result2: any[] = await executeAndEndSet500OnError(
    `
    SELECT ROUND(COUNT(*) / 2) AS NumberOfConnections
    FROM StudyBuddyConnections as t1
    WHERE t1.instanceId = ? AND t1.institutionId = ?
    AND EXISTS (
      SELECT 1 FROM StudyBuddyConnections as t2 
      WHERE t2.instanceId = ? AND t2.institutionId = ?
      AND t1.senderId = t2.receiverId AND t1.receiverId = t2.senderId
    )`,
    [instanceId, institutionId, instanceId, institutionId],
    res
  );
  const result3: any[] = await executeAndEndSet500OnError(
    `SELECT COUNT(*) as TotalRequests FROM StudyBuddyConnections WHERE instanceId = ? AND institutionId = ?`,
    [instanceId, institutionId],
    res
  );

  if (!result1 || !result2 || !result3) return;

  const combinedResults: AllCoursesStats = {
    totalUsers: result1[0].TotalUsers,
    activeUsers: result1[0].ActiveUsers,
    inactiveUsers: result1[0].InactiveUsers,
    numberOfConnections: result2[0].NumberOfConnections,
    unacceptedRequests: result3[0].TotalRequests - result2[0].NumberOfConnections * 2,
  };
  res.status(200).json(combinedResults);
}
