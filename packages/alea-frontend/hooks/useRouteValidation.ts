import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { CourseInfo } from '@alea/utils';
import { useCourses } from '@alea/react-utils';
import { useCurrentTermContext } from '../contexts/CurrentTermContext';

export interface RouteValidationResult {
  institutionId: string;
  courseId: string;
  instance: string;
  resolvedInstanceId: string | null;
  courses: { [id: string]: CourseInfo } | undefined;
  validationError: string | null;
  isValidating: boolean;
  loadingInstanceId: boolean;
  institutionValidated: boolean;
}

export function useRouteValidation(routePath: string): RouteValidationResult {
  const router = useRouter();

  const rawInstitutionId = router.query.institutionId as string;
  const courseId = router.query.courseId as string;
  const instance = router.query.instance as string;

  const institutionId = rawInstitutionId?.toUpperCase() || '';

  const { courses, isLoading: coursesLoading } = useCourses();
  const { currentTermByUniversityId } = useCurrentTermContext();

  const [institutionValidated, setInstitutionValidated] = useState(false);
  const [resolvedInstanceId, setResolvedInstanceId] = useState<string | null>(null);
  const [loadingInstanceId, setLoadingInstanceId] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    if (!router.isReady || !rawInstitutionId || !courseId || !instance) return;
    if (!institutionValidated) return;

    if (rawInstitutionId !== institutionId) {
      const normalizedPath = `/${institutionId}/${courseId}/${instance}${
        routePath ? `/${routePath}` : ''
      }`;
      const query = { ...router.query };
      query.institutionId = institutionId;

      router.replace({ pathname: normalizedPath, query }, undefined, { shallow: true });
      return;
    }
  }, [
    router.isReady,
    rawInstitutionId,
    institutionId,
    courseId,
    instance,
    institutionValidated,
    routePath,
    router,
  ]);

  useEffect(() => {
    if (!router.isReady || !institutionId || !courseId || !instance) return;
    if (coursesLoading) return;

    setIsValidating(true);
    setValidationError(null);

    // A. Validate Course (Synchronous)
    const course = courses?.[courseId];
    if (!course) {
      setValidationError('Invalid courseId');
      setIsValidating(false);
      return;
    }

    if (course.universityId && course.universityId.toUpperCase() !== institutionId) {
      setValidationError('Invalid institutionId');
      setIsValidating(false);
      setInstitutionValidated(false);
      router.push('/');
      return;
    }

    setInstitutionValidated(true);

    if (instance === 'latest') {
      const latestTerm = currentTermByUniversityId[institutionId];

      if (latestTerm) {
        setResolvedInstanceId(latestTerm);
        setLoadingInstanceId(false);
        setIsValidating(false);
      } else {
        console.error(`Could not resolve 'latest' instance for institution: ${institutionId}`);
        setValidationError('Failed to resolve latest instance');
        setLoadingInstanceId(false);
        setIsValidating(false);
      }
    } else {
      const courseInstances = course.instances || [];
      const isValidInstance = courseInstances.some((inst) => inst.semester === instance);

      if (!isValidInstance) {
        console.log(`InstanceId ${instance} not found`);
        setValidationError('Invalid instanceId');
        setIsValidating(false);
        const timer = setTimeout(() => {
          router.push('/');
        }, 3000);
        return () => clearTimeout(timer);
      } else {
        setResolvedInstanceId(instance);
        setLoadingInstanceId(false);
        setIsValidating(false);
      }
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
