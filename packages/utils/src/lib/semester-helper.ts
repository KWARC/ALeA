import { createAcl, CreateACLRequest, createResourceAction, getAcl } from '@stex-react/api';
import { Action, CURRENT_TERM } from '@stex-react/utils';

const ROLES = ['instructors', 'staff', 'tas', 'enrollments'];

function getUpdaterAclId(courseId: string, role: string): string {
  return role === 'instructors' ? 'sys-admin' : `${courseId}-${CURRENT_TERM}-instructors`;
}

function isAclOpen(role: string): boolean {
  return role === 'enrollments';
}

export async function aclExists(aclId: string): Promise<boolean> {
  try {
    await getAcl(aclId);
    return true;
  } catch (error) {
    return false;
  }
}

export async function createSemesterAclsForCourse(courseId: string) {
  for (const role of ROLES) {
    const aclId = `${courseId}-${CURRENT_TERM}-${role}`;
    if (await aclExists(aclId)) {
      console.log(`${aclId} already exists. Skipping.`);
      continue;
    }
    const acl: CreateACLRequest = {
      id: aclId,
      description: `${courseId} ${CURRENT_TERM} ${role}`,
      isOpen: isAclOpen(role),
      updaterACLId: getUpdaterAclId(courseId, role),
      memberUserIds: [],
      memberACLIds: [],
    };
    try {
      await createAcl(acl);
      console.log(`Successfully created: ${acl.id}`);
    } catch (error: any) {
      console.log(`Failed to create ${acl.id}: ${error.message}`);
    }
  }
}

export async function createInstructorResourceActions(courseId: string) {
  const aclId = `${courseId}-${CURRENT_TERM}-instructors`;
  try {
    await createResourceAction({
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/**`,
      actionId: Action.ACCESS_CONTROL,
      aclId,
    });
    console.log(`Created for instructors: ${aclId}`);
  } catch (error: any) {
    console.log(`Error for instructors ${aclId}: ${error.message}`);
  }
}

export async function createStudentResourceActions(courseId: string) {
  const aclId = `${courseId}-${CURRENT_TERM}-enrollments`;
  const resources = [
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/quiz`,
      actionId: Action.TAKE,
    },
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/homework`,
      actionId: Action.TAKE,
    },
  ];
  for (const { resourceId, actionId } of resources) {
    try {
      await createResourceAction({ resourceId, actionId, aclId });
      console.log(`Created for students: ${aclId}, resource: ${resourceId}`);
    } catch (error: any) {
      console.log(`Error for students ${aclId}, resource: ${resourceId}: ${error.message}`);
    }
  }
}

export async function createStaffResourceActions(courseId: string) {
  const aclId = `${courseId}-${CURRENT_TERM}-staff`;
  const actions = [
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/quiz`,
      actionId: Action.MUTATE,
    },
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/quiz`,
      actionId: Action.PREVIEW,
    },
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/homework`,
      actionId: Action.MUTATE,
    },
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/homework`,
      actionId: Action.INSTRUCTOR_GRADING,
    },
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/notes`,
      actionId: Action.MUTATE,
    },
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/study-buddy`,
      actionId: Action.MODERATE,
    },
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/comments`,
      actionId: Action.MODERATE,
    },
  ];
  for (const { resourceId, actionId } of actions) {
    try {
      await createResourceAction({ resourceId, actionId, aclId });
      console.log(`Created for staff: ${aclId}, resource: ${resourceId}, action: ${actionId}`);
    } catch (error: any) {
      console.log(
        `Error for staff ${aclId}, resource: ${resourceId}, action: ${actionId}: ${error.message}`
      );
    }
  }
}
