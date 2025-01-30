import { getCourseEnrollmentAcl } from '../course-home/[courseId]';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdOrSetError } from './comment-utils';
import { isMemberOfAcl } from './acl-utils/acl-common-utils';
import { CURRENT_TERM } from '@stex-react/utils';
import { getCourseInfo } from '@stex-react/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let instanceId = req.query.instanceId as string;
  if (!instanceId) instanceId = CURRENT_TERM;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) {
    return;
  }

  const courses = await getCourseInfo(process.env.NEXT_PUBLIC_MMT_URL);
  const courseIds = Object.keys(courses);
  const enrolledCourseIds: string[] = [];

  for (const courseId of courseIds) {
    try {
      const aclId = getCourseEnrollmentAcl(courseId as string, instanceId as string);
      const isMember = await isMemberOfAcl(aclId, userId);
      if (isMember) enrolledCourseIds.push(courseId);
    } catch (error) {
      console.error(`Error while checking if user is enrolled in course ${courseId}: `, error);
      continue;
    }
  }

  return res.status(200).json({ enrolledCourseIds });
}

