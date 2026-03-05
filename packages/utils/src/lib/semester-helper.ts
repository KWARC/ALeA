import {
  createAcl,
  CreateACLRequest,
  createResourceAction,
  getAcl,
  getInstructorResourceActions,
} from '@alea/spec';
import { Action, CURRENT_TERM } from '@alea/utils';

const ROLES = ['instructors', 'tas', 'staff', 'enrollments'];

function getUpdaterAclId(courseId: string, role: string, term: string): string {
  return role === 'instructors' ? 'sys-admin' : `${courseId}-${term}-instructors`;
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

export async function createSemesterAclsForCourse(courseId: string, instanceId?: string) {
  const term = instanceId ?? CURRENT_TERM;
  for (const role of ROLES) {
    const aclId = `${courseId}-${term}-${role}`;
    if (await aclExists(aclId)) {
      console.log(`${aclId} already exists. Skipping.`);
      continue;
    }

    // For staff ACL, include TAs and instructors as members
    const memberACLIds: string[] =
      role === 'staff' ? [`${courseId}-${term}-tas`, `${courseId}-${term}-instructors`] : [];

    const acl: CreateACLRequest = {
      id: aclId,
      description: `${courseId} ${term} ${role}`,
      isOpen: isAclOpen(role),
      updaterACLId: getUpdaterAclId(courseId, role, term),
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

export async function createInstructorResourceActions(courseId: string, instanceId?: string) {
  const term = instanceId ?? CURRENT_TERM;
  const aclId = `${courseId}-${term}-instructors`;
  try {
    await createResourceAction({
      resourceId: `/course/${courseId}/instance/${term}/**`,
      actionId: Action.ACCESS_CONTROL,
      aclId,
    });
    console.log(`Created for instructors: ${aclId}`);
  } catch (error: any) {
    console.log(`Error for instructors ${aclId}: ${error.message}`);
  }
}

export async function createStudentResourceActions(courseId: string, instanceId?: string) {
  const term = instanceId ?? CURRENT_TERM;
  const aclId = `${courseId}-${term}-enrollments`;
  const resources = [
    {
      resourceId: `/course/${courseId}/instance/${term}/quiz`,
      actionId: Action.TAKE,
    },
    {
      resourceId: `/course/${courseId}/instance/${term}/homework`,
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

export async function createStaffResourceActions(courseId: string, instanceId?: string) {
  const term = instanceId ?? CURRENT_TERM;
  const aclId = `${courseId}-${term}-staff`;
  const actions = [
    {
      resourceId: `/course/${courseId}/instance/${term}/quiz`,
      actionId: Action.MUTATE,
    },
    {
      resourceId: `/course/${courseId}/instance/${term}/quiz`,
      actionId: Action.PREVIEW,
    },
    {
      resourceId: `/course/${courseId}/instance/${term}/homework`,
      actionId: Action.MUTATE,
    },
    {
      resourceId: `/course/${courseId}/instance/${term}/homework`,
      actionId: Action.INSTRUCTOR_GRADING,
    },
    {
      resourceId: `/course/${courseId}/instance/${term}/notes`,
      actionId: Action.MUTATE,
    },
    {
      resourceId: `/course/${courseId}/instance/${term}/study-buddy`,
      actionId: Action.MODERATE,
    },
    {
      resourceId: `/course/${courseId}/instance/${term}/comments`,
      actionId: Action.MODERATE,
    },
    {
      resourceId: `/course/${courseId}/instance/${term}/syllabus`,
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
export async function createMetadataResourceActions(courseId: string, instanceId?: string) {
  const term = instanceId ?? CURRENT_TERM;
  const aclId = `${courseId}-${term}-instructors`;
  try {
    await createResourceAction({
      resourceId: `/course/${courseId}/instance/${term}/metadata`,
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

export function getExpectedResourceActions(courseId: string, instanceId?: string) {
  const term = instanceId ?? CURRENT_TERM;
  return [
    // Instructors
    {
      resourceId: `/course/${courseId}/instance/${term}/**`,
      actionId: Action.ACCESS_CONTROL,
      aclId: `${courseId}-${term}-instructors`,
    },
    {
      resourceId: `/course/${courseId}/instance/${term}/metadata`,
      actionId: Action.MUTATE,
      aclId: `${courseId}-${term}-instructors`,
    },
    // Students
    {
      resourceId: `/course/${courseId}/instance/${term}/quiz`,
      actionId: Action.TAKE,
      aclId: `${courseId}-${term}-enrollments`,
    },
    {
      resourceId: `/course/${courseId}/instance/${term}/homework`,
      actionId: Action.TAKE,
      aclId: `${courseId}-${term}-enrollments`,
    },
    // Staff
    {
      resourceId: `/course/${courseId}/instance/${term}/quiz`,
      actionId: Action.MUTATE,
      aclId: `${courseId}-${term}-staff`,
    },
    {
      resourceId: `/course/${courseId}/instance/${term}/quiz`,
      actionId: Action.PREVIEW,
      aclId: `${courseId}-${term}-staff`,
    },
    {
      resourceId: `/course/${courseId}/instance/${term}/homework`,
      actionId: Action.MUTATE,
      aclId: `${courseId}-${term}-staff`,
    },
    {
      resourceId: `/course/${courseId}/instance/${term}/homework`,
      actionId: Action.INSTRUCTOR_GRADING,
      aclId: `${courseId}-${term}-staff`,
    },
    {
      resourceId: `/course/${courseId}/instance/${term}/notes`,
      actionId: Action.MUTATE,
      aclId: `${courseId}-${term}-staff`,
    },
    {
      resourceId: `/course/${courseId}/instance/${term}/study-buddy`,
      actionId: Action.MODERATE,
      aclId: `${courseId}-${term}-staff`,
    },
    {
      resourceId: `/course/${courseId}/instance/${term}/comments`,
      actionId: Action.MODERATE,
      aclId: `${courseId}-${term}-staff`,
    },
    {
      resourceId: `/course/${courseId}/instance/${term}/syllabus`,
      actionId: Action.MUTATE,
      aclId: `${courseId}-${term}-staff`,
    },
  ];
}

export async function isCourseSemesterSetupComplete(
  courseId: string,
  instanceId?: string
): Promise<boolean> {
  const term = instanceId ?? CURRENT_TERM;
  try {
    // Check ACLs
    const aclIds = ROLES.map((role) => `${courseId}-${term}-${role}`);
    const aclPresence = await Promise.all(aclIds.map((id) => aclExists(id)));
    const allAclsPresent = aclPresence.every(Boolean);

    if (!allAclsPresent) return false;

    // Check resource actions
    const expected = getExpectedResourceActions(courseId, term);
    const allResourceActions = await getInstructorResourceActions(courseId, term);
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
