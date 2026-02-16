import { getAllCoursesFromDb } from './get-all-courses';
import { getCurrentTermForCourseId } from './get-current-term';
import { NextApiRequest, NextApiResponse } from 'next';
import { getCourseEnrollmentAcl } from '../../components/courseHelpers';
import { isMemberOfAcl } from './acl-utils/acl-common-utils';
import { getUserIdOrSetError } from './comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const instanceId = req.body.instanceId as string;

  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const courses = await getAllCoursesFromDb();
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
