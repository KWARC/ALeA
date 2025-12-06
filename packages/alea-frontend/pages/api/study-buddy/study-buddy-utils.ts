import { getCurrentTermForCourseId } from '@alea/utils';

export async function getSbCourseId(courseId: string, instanceId?: string) {
  const resolvedInstanceId = instanceId || await getCurrentTermForCourseId(courseId);
  return `${courseId}||${resolvedInstanceId}`;
}

export function getCourseIdAndInstanceFromSbCourseId(sbCourseId: string) {
  const [courseId, instanceId] = sbCourseId.split('||');
  return { courseId, instanceId };
}
