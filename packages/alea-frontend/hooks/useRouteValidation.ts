import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import {
  getAllCourses,
  getLatestInstance,
  validateInstitution,
  validateInstance,
} from '@alea/spec';
import { CourseInfo } from '@alea/utils';

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
  
  const [institutionValidated, setInstitutionValidated] = useState(false);
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo } | undefined>(undefined);
  const [resolvedInstanceId, setResolvedInstanceId] = useState<string | null>(null);
  const [loadingInstanceId, setLoadingInstanceId] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  // FIX: Fixed infinite reload loop by:
  // 1. Removed router.query from dependencies (was causing effect to re-run on every query change)
  // 2. Only normalize institutionId case, not query params (query params like sectionId, slideNum are valid)
  // 3. Use shallow routing to prevent full page reloads
  useEffect(() => {
    if (!router.isReady || !rawInstitutionId || !courseId || !instance) return;
    if (!institutionValidated) return;
    
    // Only normalize if the institutionId case doesn't match
    // Don't check for unwanted query params here - they might be valid (like sectionId, slideNum, etc.)
    if (rawInstitutionId !== institutionId) {
      const normalizedPath = `/${institutionId}/${courseId}/${instance}${routePath ? `/${routePath}` : ''}`;
      // Preserve existing query params
      const query = { ...router.query };
      query.institutionId = institutionId;
      // Use shallow routing to update URL without full page reload
      router.replace({ pathname: normalizedPath, query }, undefined, { shallow: true });
      return;
    }
  }, [router.isReady, rawInstitutionId, institutionId, courseId, instance, institutionValidated, routePath]);

  useEffect(() => {
    if (!router.isReady || !institutionId || !courseId || !instance) return;

    setIsValidating(true);
    setValidationError(null);

    validateInstitution(institutionId)
      .then((isValid) => {
        if (!isValid) {
          setValidationError('Invalid institutionId');
          setIsValidating(false);
          setInstitutionValidated(false);
          router.push('/');
          return;
        }
        
        setInstitutionValidated(true);
        
        getAllCourses().then((allCourses) => {
          setCourses(allCourses);
          if (!allCourses[courseId]) {
            setValidationError('Invalid courseId');
            setIsValidating(false);
            return;
          }
          
          if (instance === 'latest') {
            setLoadingInstanceId(true);
            getLatestInstance(institutionId)
              .then((latestInstanceId) => {
                setResolvedInstanceId(latestInstanceId);
                setLoadingInstanceId(false);
                setIsValidating(false);
              })
              .catch((error) => {
                console.error('Failed to fetch latest instanceId:', error);
                setValidationError('Failed to fetch latest instanceId');
                setLoadingInstanceId(false);
                setIsValidating(false);
              });
          } else {
            validateInstance(institutionId, instance)
              .then((isValidInstance) => {
                if (!isValidInstance) {
                  console.log(`InstanceId ${instance} not found`);
                  setValidationError('Invalid instanceId');
                  setIsValidating(false);
                  setTimeout(() => {
                    router.push('/');
                  }, 3000);
                } else {
                  setResolvedInstanceId(instance);
                  setLoadingInstanceId(false);
                  setIsValidating(false);
                }
              })
              .catch((error) => {
                console.error('Error validating instanceId:', error);
                setValidationError('Invalid instanceId');
                setIsValidating(false);
                setTimeout(() => {
                  router.push('/');
                }, 3000);
              });
          }
        });
      })
      .catch((error) => {
        console.error('Error validating institutionId:', error);
        const errorMessage = error.message || 'Error validating institutionId';
        setValidationError(errorMessage);
        setIsValidating(false);
        setInstitutionValidated(false);
      });
  }, [router.isReady, institutionId, courseId, instance, router]);

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
