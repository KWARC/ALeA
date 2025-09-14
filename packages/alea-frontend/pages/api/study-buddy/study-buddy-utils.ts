import { CURRENT_TERM } from '@alea/utils';

export function getSbCourseId(courseId: string, instanceId: string = CURRENT_TERM) {
  return `${courseId}||${instanceId}`;
}

export function getCourseIdAndInstanceFromSbCourseId(sbCourseId: string) {
  const [courseId, instanceId] = sbCourseId.split('||');
  return { courseId, instanceId };
}
