import { addRemoveMember } from '@alea/spec';
import { isFauId } from '@alea/utils';

export function getCourseEnrollmentAcl(courseId: string, instanceId: string) {
  return `${courseId}-${instanceId}-enrollments`;
}

export async function handleEnrollment(userId: string, courseId: string, currentTerm: string) {
  if (!userId || !isFauId(userId)) {
    alert('Please Login Using FAU Id.');
    return false;
  }

  try {
    await addRemoveMember({
      memberId: userId,
      aclId: getCourseEnrollmentAcl(courseId, currentTerm),
      isAclMember: false,
      toBeAdded: true,
    });
    alert('Enrollment successful!');
    return true;
  } catch (error) {
    console.error('Error during enrollment:', error);
    alert('Enrollment failed. Please try again.');
    return false;
  }
}

export async function handleUnEnrollment(userId: string, courseId: string, currentTerm: string) {
  if (!userId || !isFauId(userId)) {
    alert('Please Login Using FAU Id.');
    return false;
  }

  try {
    await addRemoveMember({
      memberId: userId,
      aclId: getCourseEnrollmentAcl(courseId, currentTerm),
      isAclMember: false,
      toBeAdded: false,
    });

    alert('You have been unenrolled.');
    return true;
  } catch (error) {
    console.error('Error during unenrollment:', error);
    alert('Unable to unenroll. Please try again.');
    return false;
  }
}
