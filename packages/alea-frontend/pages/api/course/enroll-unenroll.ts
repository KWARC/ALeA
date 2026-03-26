import { NextApiRequest, NextApiResponse } from 'next';
import {
  getUserIdOrSetError,
  checkIfPostOrSetError,
} from '../comment-utils';
import { getSemesterInfoFromDb } from '../calendar/create-calendar';
import { addRemoveMemberOrSetError } from '../access-control/add-remove-member';

function getCourseEnrollmentAcl(courseId: string, instanceId: string) {
  return `${courseId}-${instanceId}-enrollments`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const { courseId, instanceId, action, universityId = 'FAU' } = req.body;

  if (!courseId || !instanceId || !action) {
    return res.status(422).send('Missing required fields: courseId, instanceId, or action.');
  }

  const aclId = getCourseEnrollmentAcl(courseId, instanceId);

  if (action === 'enroll') {
    const semesterData = await getSemesterInfoFromDb(universityId, instanceId);
    if (semesterData?.semesterEnd && new Date() > new Date(semesterData.semesterEnd)) {
      return res.status(403).send('Enrollment closed: Semester has ended.');
    }
  } else if (action !== 'unenroll') {
    return res.status(400).send('Invalid action. Use "enroll" or "unenroll".');
  }

  const success = await addRemoveMemberOrSetError(
    {
      memberId: userId,
      aclId: aclId,
      isAclMember: false,
      toBeAdded: action === 'enroll',
    },
    req,
    res
  );

  if (!success) return;

  res.status(200).json({ success: true, action });
}
