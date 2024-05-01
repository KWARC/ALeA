import { NextApiRequest, NextApiResponse } from 'next';
import {
    executeAndEndSet500OnError,
    getUserIdOrSetError,
} from '../comment-utils';
import { AllCoursesStats, isModerator } from '@stex-react/api';
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const userId = await getUserIdOrSetError(req, res);
    if (!userId) return;

    if (!isModerator(userId)) {
        res.status(403).send({ message: 'Unauthorized.' });
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
        `SELECT 
          COUNT(userId) as TotalUsers, 
          SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as ActiveUsers,
          SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END) as InactiveUsers 
        FROM StudyBuddyUsers`,
        [],
        res
    );
    const result2: any[] = await executeAndEndSet500OnError(
        `SELECT ROUND(COUNT(*) / 2) AS NumberOfConnections
        FROM StudyBuddyConnections as t1
        WHERE EXISTS (
          SELECT 1 FROM StudyBuddyConnections as t2 WHERE t1.senderId = t2.receiverId
          AND t1.receiverId = t2.senderId
        )`,
        [],
        res
    );
    const result3: any[] = await executeAndEndSet500OnError(
        `SELECT COUNT(*) as TotalRequests FROM StudyBuddyConnections`,
        [],
        res
    );

    if (
        !result1 ||
        !result2 ||
        !result3
    )
        return;

    const combinedResults: AllCoursesStats = {
        totalUsers: result1[0].TotalUsers,
        activeUsers: result1[0].ActiveUsers,
        inactiveUsers: result1[0].InactiveUsers,
        numberOfConnections: result2[0].NumberOfConnections,
        unacceptedRequests:
            result3[0].TotalRequests - result2[0].NumberOfConnections * 2,
    };
    res.status(200).json(combinedResults);
}
