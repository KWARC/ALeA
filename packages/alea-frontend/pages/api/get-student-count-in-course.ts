import { getCourseEnrollmentAcl } from '../course-home/[courseId]';
import { getAclMembers } from './acl-utils/acl-common-utils';

export default async function handler(req, res) {
  try {
    const { courseId, instanceId } = req.query;
    if (!courseId || !instanceId) {
      return res.status(400).send('Missing courseId or instanceId in query parameters.');
    }

    const aclId = getCourseEnrollmentAcl(courseId as string, instanceId as string);
    const enrolledPersons = (await getAclMembers(aclId)) ?? [];

    if (enrolledPersons.length === 0) {
      return res.status(200).json({ studentCount: 0 });
    }

    return res.status(200).json({ studentCount: enrolledPersons.length });
  } catch (error) {
    console.error('Error fetching student number enrolled:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
