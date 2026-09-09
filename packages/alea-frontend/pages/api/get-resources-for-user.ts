import {
  Action,
  ALL_RESOURCE_TYPES,
  COURSE_SPECIFIC_RESOURCENAMES,
  CourseResourceAction,
  getCurrentTermForUniversity,
  getUpcomingTermForUniversity,
  ResourceName,
} from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { isUserIdAuthorizedForAny } from './access-control/resource-utils';
import { getUserIdOrSetError } from './comment-utils';
import { getAllCoursesFromDb } from './get-all-courses';

function getValidActionsForResource(resourceName: ResourceName): Action[] {
  const resource = ALL_RESOURCE_TYPES.find((resource) => resource.name === resourceName);
  if (!resource) {
    throw new Error(`Resource ${resourceName} not found`);
  }
  return resource.possibleActions;
}

export async function getAuthorizedCourseResources(userId: string, includeUpcomingTerm = false) {
  const courses = await getAllCoursesFromDb();
  const resourceNames = COURSE_SPECIFIC_RESOURCENAMES;

  const resourceActions: CourseResourceAction[] = [];
  for (const [courseId, course] of Object.entries(courses)) {
    const universityId = course.universityId ?? 'FAU';
    const terms = [
      getCurrentTermForUniversity(universityId),
      includeUpcomingTerm ? getUpcomingTermForUniversity(universityId) : undefined,
    ].filter((term): term is string => !!term && term !== 'null');

    const uniqueTerms = [...new Set(terms)];
    for (const instanceId of uniqueTerms) {
      for (const name of resourceNames) {
        resourceActions.push({
          courseId,
          instanceId,
          name,
          actions: getValidActionsForResource(name),
        });
      }
    }
  }

  const validResourceActions = (
    await Promise.all(
      resourceActions.map(async ({ name, courseId, instanceId, actions }) => {
        const validActions: Action[] = [];

        for (const action of actions) {
          const isAuthorized = await isUserIdAuthorizedForAny(userId, [
            { name, action, variables: { courseId, instanceId } },
          ]);

          if (isAuthorized) validActions.push(action);
        }
        return validActions.length ? { name, courseId, instanceId, actions: validActions } : null;
      })
    )
  ).filter((resource): resource is CourseResourceAction => resource !== null);
  return validResourceActions;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const authorizedResourceActions = await getAuthorizedCourseResources(userId, true);

  return res.status(200).json(authorizedResourceActions);
}
