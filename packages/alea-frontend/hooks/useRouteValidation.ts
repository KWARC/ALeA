import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import type { CourseInfo } from '@alea/utils';
import { useCourses } from '@alea/react-utils';
import { useCurrentTermContext } from '../contexts/CurrentTermContext';

export interface RouteValidationResult {
  institutionId: string;
  courseId: string;
  instance: string;
  resolvedInstanceId: string | null;
  courses: Record<string, CourseInfo> | undefined;
  validationError: string | null;
  isValidating: boolean;
  loadingInstanceId: boolean;
  institutionValidated: boolean;
}

function resolveLatestInstance(
  course: CourseInfo,
  institutionId: string,
  currentTermByUniversityId: Record<string, string>
): string | null {
  const courseInstances = course.instances || [];
  if (courseInstances.length === 0) return null;

  const institutionLatestTerm = currentTermByUniversityId[institutionId];

  if (institutionLatestTerm) {
    const hasInstitutionLatest = courseInstances.some(
      (inst) => inst.semester === institutionLatestTerm
    );
    if (hasInstitutionLatest) {
      return institutionLatestTerm;
    }
  }

  return courseInstances[courseInstances.length - 1]?.semester || null;
}

function isValidInstanceForCourse(course: CourseInfo, instance: string): boolean {
  const courseInstances = course.instances || [];
  return courseInstances.some((inst) => inst.semester === instance);
}

function buildNormalizedPath(
  institutionId: string,
  courseId: string,
  instance: string,
  routePath: string
): string {
  const basePath = `/${institutionId}/${courseId}/${instance}`;
  return routePath ? `${basePath}/${routePath}` : basePath;
}

function removeRouteParamsFromQuery(query: Record<string, unknown>) {
  const { institutionId, courseId, instance, ...rest } = query;
  return rest;
}

function findCourse(courses: Record<string, CourseInfo> | undefined, courseId: string): CourseInfo | undefined {
  if (!courses || !courseId) return undefined;
  return courses[courseId] ?? courses[courseId.toLowerCase()];
}

export function useRouteValidation(routePath: string): RouteValidationResult {
  const router = useRouter();
  const { courses, isLoading: coursesLoading } = useCourses();
  const { currentTermByUniversityId } = useCurrentTermContext();

  const rawInstitutionId = router.query.institutionId as string;
  const courseId = router.query.courseId as string;
  const instance = router.query.instance as string;
  const institutionId = rawInstitutionId?.toUpperCase() || '';

  const [institutionValidated, setInstitutionValidated] = useState(false);
  const [resolvedInstanceId, setResolvedInstanceId] = useState<string | null>(null);
  const [loadingInstanceId, setLoadingInstanceId] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    if (!router.isReady || !rawInstitutionId || !courseId || !instance) return;
    if (!institutionValidated || !resolvedInstanceId) return;

    const needsCaseFix = rawInstitutionId !== institutionId;
    const needsInstanceResolve = instance === 'latest';

    if (!needsCaseFix && !needsInstanceResolve) return;

    const actualInstance = needsInstanceResolve ? resolvedInstanceId : instance;
    const normalizedPath = buildNormalizedPath(institutionId, courseId, actualInstance, routePath);
    const cleanQuery = removeRouteParamsFromQuery(router.query as Record<string, unknown>) as Record<string, string | string[]>;

    router.replace({ pathname: normalizedPath, query: cleanQuery }, undefined, { shallow: true });
  }, [
    router.isReady,
    rawInstitutionId,
    institutionId,
    courseId,
    instance,
    resolvedInstanceId,
    institutionValidated,
    routePath,
    router,
  ]);

  useEffect(() => {
    if (!router.isReady || !institutionId || !courseId || !instance) return;
    if (coursesLoading) return;

    setIsValidating(true);
    setValidationError(null);

    const course = findCourse(courses, courseId);
    if (!course) {
      setValidationError('Invalid courseId');
      setIsValidating(false);
      return;
    }

    if (course.universityId && course.universityId.toUpperCase() !== institutionId) {
      setValidationError('Invalid institutionId');
      setIsValidating(false);
      setInstitutionValidated(false);
      setTimeout(() => router.push('/'), 0);
      return;
    }

    setInstitutionValidated(true);

    if (instance === 'latest') {
      const resolvedInstance = resolveLatestInstance(
        course,
        institutionId,
        currentTermByUniversityId
      );

      if (resolvedInstance) {
        setResolvedInstanceId(resolvedInstance);
        setLoadingInstanceId(false);
        setIsValidating(false);
      } else {
        console.error(`Could not resolve 'latest' instance for course "${courseId}"`);
        setValidationError('Failed to resolve latest instance');
        setLoadingInstanceId(false);
        setIsValidating(false);
      }
    } else {
      if (!isValidInstanceForCourse(course, instance)) {
        console.error(`Instance "${instance}" not found for course "${courseId}"`);
        setValidationError('Invalid instanceId');
        setIsValidating(false);
        setTimeout(() => router.push('/'), 3000);
        return;
      }

      setResolvedInstanceId(instance);
      setLoadingInstanceId(false);
      setIsValidating(false);
    }
  }, [
    router.isReady,
    institutionId,
    courseId,
    instance,
    courses,
    coursesLoading,
    currentTermByUniversityId,
    router,
  ]);

  return {
    institutionId,
    courseId,
    instance,
    resolvedInstanceId,
    courses,
    validationError,
    isValidating,
    loadingInstanceId,
    institutionValidated,
  };
}
