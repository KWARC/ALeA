import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import {
  getAllCourses,
  getLatestInstance,
  validateInstitution,
  validateInstance,
  CourseInfo,
} from '@alea/spec';

export interface RouteValidationResult {
  institutionId: string;
  courseId: string;
  instanceIdOrLatest: string;
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
  const instanceIdOrLatest = router.query.instanceIdOrLatest as string;
  
  const institutionId = rawInstitutionId?.toUpperCase() || '';
  
  const [institutionValidated, setInstitutionValidated] = useState(false);
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo } | undefined>(undefined);
  const [resolvedInstanceId, setResolvedInstanceId] = useState<string | null>(null);
  const [loadingInstanceId, setLoadingInstanceId] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    if (!router.isReady || !rawInstitutionId || !courseId || !instanceIdOrLatest) return;
    if (!institutionValidated) return;
    
    const expectedQueryKeys = ['institutionId', 'courseId', 'instanceIdOrLatest'];
    const hasUnwantedQuery = Object.keys(router.query).some(key => 
      !expectedQueryKeys.includes(key) || (key === 'courseId' && router.query.courseId !== courseId)
    );
    
    if (rawInstitutionId !== institutionId || hasUnwantedQuery) {
      const normalizedPath = `/${institutionId}/${courseId}/${instanceIdOrLatest}${routePath ? `/${routePath}` : ''}`;
      router.replace(normalizedPath);
      return;
    }
  }, [router.isReady, rawInstitutionId, institutionId, courseId, instanceIdOrLatest, institutionValidated, router, router.query, routePath]);

  useEffect(() => {
    if (!router.isReady || !institutionId || !courseId || !instanceIdOrLatest) return;

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
          
          if (instanceIdOrLatest === 'latest') {
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
            validateInstance(institutionId, instanceIdOrLatest)
              .then((isValidInstance) => {
                if (!isValidInstance) {
                  console.log(`InstanceId ${instanceIdOrLatest} not found`);
                  setValidationError('Invalid instanceId');
                  setIsValidating(false);
                  setTimeout(() => {
                    router.push('/');
                  }, 3000);
                } else {
                  setResolvedInstanceId(instanceIdOrLatest);
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
  }, [router.isReady, institutionId, courseId, instanceIdOrLatest, router]);

  return {
    institutionId,
    courseId,
    instanceIdOrLatest,
    resolvedInstanceId,
    courses,
    validationError,
    isValidating,
    loadingInstanceId,
    institutionValidated,
  };
}
