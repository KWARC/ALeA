import { GetSortedCoursesByConnectionsResponse } from '@alea/spec';
import { getCurrentTermForCourseId } from '../get-current-term';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfCanModerateStudyBuddyOrSetError } from '../access-control/resource-utils';
import { executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdIfCanModerateStudyBuddyOrSetError(req, res);
  if (!userId) return;

  const instanceId = req.query.instanceId as string;
  const institutionId = req.query.institutionId as string;

  if (!institutionId) {
    res.status(422).end('Missing required field: institutionId');
    return;
  }

  const results: any[] = await executeAndEndSet500OnError(
    `SELECT COUNT(courseId) as member, courseId
        FROM StudyBuddyUsers
        WHERE instanceId = ? AND institutionId = ?
        GROUP BY courseId
        ORDER BY member DESC`,
    [instanceId, institutionId],
    res
  );
  const allCoursesInfo: GetSortedCoursesByConnectionsResponse[] = results.map((r) => ({
    courseId: r.courseId,
    member: r.member,
  }));
  res.status(200).json(allCoursesInfo);
}
