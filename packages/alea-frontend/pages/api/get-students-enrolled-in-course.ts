import { getResourceId, INSTRUCTOR_RESOURCE_AND_ACTION } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getCourseEnrollmentAcl } from '../../components/courseHelpers';
import { getAclMembers } from './acl-utils/acl-common-utils';
import { returnAclIdForResourceIdAndActionId } from './acl-utils/resourceaccess-utils/resource-common-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { courseId, instanceId } = req.query;
    if (!courseId || !instanceId) {
      return res.status(400).json({ error: 'Missing courseId or instanceId in query parameters.' });
    }

    const instructorResourceIdAndAction = INSTRUCTOR_RESOURCE_AND_ACTION.map(
      ({ resource, action }) => ({
        resourceId: getResourceId(resource, {
          courseId: courseId as string,
          instanceId: instanceId as string,
        }),
        action,
      })
    );

    const aclId = getCourseEnrollmentAcl(courseId as string, instanceId as string);
    const enrolledPersons = await getAclMembers(aclId);

    const INSTRUCTOR_ACLS = Array.from(
      new Set(
        await Promise.all(
          instructorResourceIdAndAction.map(async ({ resourceId, action }) => {
            const aclId = await returnAclIdForResourceIdAndActionId(resourceId, action);
            return aclId;
          })
        )
      )
    );

    const instructors = (
      await Promise.all(
        INSTRUCTOR_ACLS.map(async (aclId) => {
          const result = await getAclMembers(aclId);
          return result || [];
        })
      )
    ).flat();

    const uniqueInstructors = new Set(instructors);
    const enrolledStudents = enrolledPersons.filter((person) => !uniqueInstructors.has(person));
    return res.status(200).json(enrolledStudents);
  } catch (error) {
    console.error('Error fetching enrolled students:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
