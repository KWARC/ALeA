import { CourseInfo } from '@alea/utils';

export function getCourseById(
  courses: Record<string, CourseInfo>,
  courseId: string,
  institutionId?: string
): CourseInfo | undefined {
  if (!courses || !courseId) return undefined;
  const courseIdLower = courseId.toLowerCase();
  if (institutionId) {
    const compositeKey = `${institutionId}||${courseId}`.toLowerCase();
    if (courses[compositeKey]) return courses[compositeKey];
  }

  if (courses[courseIdLower]) {
    return courses[courseIdLower];
  }

  return Object.values(courses).find((c) => c.courseId.toLowerCase() === courseId.toLowerCase());
}
