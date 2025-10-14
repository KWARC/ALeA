import {
  createAcl,
  CreateACLRequest,
  createResourceAction,
  getAcl,
  getInstructorResourceActions,
} from '@alea/spec';
import { Action, CURRENT_TERM } from '@alea/utils';

const ROLES = ['instructors', 'tas', 'staff', 'enrollments'];

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

    // For staff ACL, include TAs and instructors as members
    const memberACLIds: string[] =
      role === 'staff'
        ? [`${courseId}-${CURRENT_TERM}-tas`, `${courseId}-${CURRENT_TERM}-instructors`]
        : [];

    const acl: CreateACLRequest = {
      id: aclId,
      description: `${courseId} ${CURRENT_TERM} ${role}`,
      isOpen: isAclOpen(role),
      updaterACLId: getUpdaterAclId(courseId, role),
      memberUserIds: [],
      memberACLIds,
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
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/syllabus`,
      actionId: Action.MUTATE,
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
export async function createMetadataResourceActions(courseId: string) {
  const aclId = `${courseId}-${CURRENT_TERM}-instructors`;
  try {
    await createResourceAction({
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/metadata`,
      actionId: Action.MUTATE,
      aclId,
    });
    console.log(`Created metadata resource action for instructors: ${aclId}`);
  } catch (error: any) {
    console.log(
      `Error creating metadata resource action for instructors ${aclId}: ${error.message}`
    );
  }
}

export function getExpectedResourceActions(courseId: string) {
  return [
    // Instructors
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/**`,
      actionId: Action.ACCESS_CONTROL,
      aclId: `${courseId}-${CURRENT_TERM}-instructors`,
    },
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/metadata`,
      actionId: Action.MUTATE,
      aclId: `${courseId}-${CURRENT_TERM}-instructors`,
    },
    // Students
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/quiz`,
      actionId: Action.TAKE,
      aclId: `${courseId}-${CURRENT_TERM}-enrollments`,
    },
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/homework`,
      actionId: Action.TAKE,
      aclId: `${courseId}-${CURRENT_TERM}-enrollments`,
    },
    // Staff
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/quiz`,
      actionId: Action.MUTATE,
      aclId: `${courseId}-${CURRENT_TERM}-staff`,
    },
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/quiz`,
      actionId: Action.PREVIEW,
      aclId: `${courseId}-${CURRENT_TERM}-staff`,
    },
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/homework`,
      actionId: Action.MUTATE,
      aclId: `${courseId}-${CURRENT_TERM}-staff`,
    },
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/homework`,
      actionId: Action.INSTRUCTOR_GRADING,
      aclId: `${courseId}-${CURRENT_TERM}-staff`,
    },
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/notes`,
      actionId: Action.MUTATE,
      aclId: `${courseId}-${CURRENT_TERM}-staff`,
    },
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/study-buddy`,
      actionId: Action.MODERATE,
      aclId: `${courseId}-${CURRENT_TERM}-staff`,
    },
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/comments`,
      actionId: Action.MODERATE,
      aclId: `${courseId}-${CURRENT_TERM}-staff`,
    },
    {
      resourceId: `/course/${courseId}/instance/${CURRENT_TERM}/syllabus`,
      actionId: Action.MUTATE,
      aclId: `${courseId}-${CURRENT_TERM}-staff`,
    },
  ];
}

export async function isCourseSemesterSetupComplete(courseId: string): Promise<boolean> {
  try {
    // Check ACLs
    const aclIds = ROLES.map((role) => `${courseId}-${CURRENT_TERM}-${role}`);
    const aclPresence = await Promise.all(aclIds.map((id) => aclExists(id)));
    const allAclsPresent = aclPresence.every(Boolean);

    if (!allAclsPresent) return false;

    // Check resource actions
    const expected = getExpectedResourceActions(courseId);
    const allResourceActions = await getInstructorResourceActions(courseId, CURRENT_TERM);
    const hasAllResourceActions = expected.every((exp) =>
      allResourceActions.some(
        (ra) =>
          ra.resourceId === exp.resourceId && ra.actionId === exp.actionId && ra.aclId === exp.aclId
      )
    );
    return hasAllResourceActions;
  } catch (e) {
    return false;
  }
}
