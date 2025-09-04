import { GetSortedCoursesByConnectionsResponse } from '@stex-react/spec';
import { CURRENT_TERM } from '@stex-react/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfCanModerateStudyBuddyOrSetError } from '../access-control/resource-utils';
import { executeAndEndSet500OnError } from '../comment-utils';
import { getCourseIdAndInstanceFromSbCourseId } from './study-buddy-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdIfCanModerateStudyBuddyOrSetError(req, res);
  if (!userId) return;

  let instanceId = req.query.instanceId as string;
  if (!instanceId) instanceId = CURRENT_TERM;

  const results: any[] = await executeAndEndSet500OnError(
    `SELECT COUNT(sbCourseId) as member, sbCourseId
        FROM StudyBuddyUsers
        WHERE sbCourseId LIKE '%${instanceId}'
        GROUP BY sbCourseId
        ORDER BY member DESC`,
    [],
    res
  );
  const allCoursesInfo: GetSortedCoursesByConnectionsResponse[] = results.map((r) => ({
    courseId: getCourseIdAndInstanceFromSbCourseId(r.sbCourseId).courseId,
    member: r.member,
  }));
  res.status(200).json(allCoursesInfo);
}
