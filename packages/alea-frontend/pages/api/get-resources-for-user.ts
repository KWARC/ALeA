import { getCourseInfo } from '@stex-react/api';
import {
  Action,
  ALL_RESOURCE_TYPES,
  COURSE_SPECIFIC_RESOURCENAMES,
  CourseResourceAction,
  CURRENT_TERM,
  ResourceName,
} from '@stex-react/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { isUserIdAuthorizedForAny } from './access-control/resource-utils';
import { getUserIdOrSetError } from './comment-utils';

function getValidActionsForResource(resourceName: ResourceName): Action[] {
  const resource = ALL_RESOURCE_TYPES.find((resource) => resource.name === resourceName);
  if (!resource) {
    throw new Error(`Resource ${resourceName} not found`);
  }
  return resource.possibleActions;
}

export async function getAuthorizedCourseResources(userId: string) {
  const courseIds = Object.keys(await getCourseInfo());
  const resourceNames = COURSE_SPECIFIC_RESOURCENAMES;

  const resourceActions: CourseResourceAction[] = courseIds.flatMap((courseId) =>
    resourceNames.flatMap((name) => {
      const actions = getValidActionsForResource(name);
      return {
        courseId,
        name,
        actions,
      };
    })
  );

  const validResourceActions = (
    await Promise.all(
      resourceActions.map(async ({ name, courseId, actions }) => {
        const validActions = [];

        for (const action of actions) {
          const isAuthorized = await isUserIdAuthorizedForAny(userId, [
            { name, action, variables: { courseId, instanceId: CURRENT_TERM } },
          ]);

          if (isAuthorized) validActions.push(action);
        }
        return validActions.length ? { name, courseId, actions: validActions } : null;
      })
    )
  ).filter((resource) => resource !== null);
  return validResourceActions;
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const authorizedResourceActions = await getAuthorizedCourseResources(userId);

  return res.status(200).json(authorizedResourceActions);
}
