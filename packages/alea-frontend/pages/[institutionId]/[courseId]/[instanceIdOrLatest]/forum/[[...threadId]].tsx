import { Box, CircularProgress } from '@mui/material';
import { getAllCourses, getLatestInstance, validateInstitution, validateInstance } from '@alea/spec';
import { CourseInfo } from '@alea/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { ForumView } from '../../../../../components/ForumView';
import { ThreadView } from '../../../../../components/ThreadView';
import { getLocaleObject } from '../../../../../lang/utils';
import MainLayout from '../../../../../layouts/MainLayout';
import { CourseHeader } from '../../../../course-home/[courseId]';

const ForumPage: NextPage = () => {
  const router = useRouter();
  const { home } = getLocaleObject(router);
  const t = home.courseThumb;
  
  const rawInstitutionId = router.query.institutionId as string;
  const courseId = router.query.courseId as string;
  const instanceIdOrLatest = router.query.instanceIdOrLatest as string;
  const threadId = router.query.threadId?.[0] ? +(router.query.threadId[0] as string) : undefined;
  
  const institutionId = rawInstitutionId?.toUpperCase() || '';
  
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo } | undefined>(undefined);
  const [resolvedInstanceId, setResolvedInstanceId] = useState<string | null>(null);
  const [loadingInstanceId, setLoadingInstanceId] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    if (!router.isReady || !rawInstitutionId || !courseId || !instanceIdOrLatest) return;
    if (rawInstitutionId !== institutionId) {
      const queryString = router.asPath.includes('?') ? router.asPath.split('?')[1] : '';
      const normalizedPath = `/${institutionId}/${courseId}/${instanceIdOrLatest}/forum${threadId ? `/${threadId}` : ''}${queryString ? `?${queryString}` : ''}`;
      router.replace(normalizedPath);
      return;
    }
  }, [router.isReady, rawInstitutionId, institutionId, courseId, instanceIdOrLatest, threadId, router]);

  useEffect(() => {
    if (!router.isReady || !institutionId || !courseId || !instanceIdOrLatest) return;
    
    setIsValidating(true);
    setValidationError(null);
    
    validateInstitution(institutionId)
      .then((isValid) => {
        if (!isValid) {
          setValidationError('Invalid institutionId');
          setIsValidating(false);
          setTimeout(() => router.push('/'), 3000);
          return;
        }
        
        getAllCourses().then((allCourses) => {
          setCourses(allCourses);
          if (!allCourses[courseId]) {
            setValidationError('Invalid courseId');
            setIsValidating(false);
            setTimeout(() => router.push('/'), 3000);
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
                  setValidationError('Invalid instanceId');
                  setIsValidating(false);
                  setTimeout(() => router.push('/'), 3000);
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
                setTimeout(() => router.push('/'), 3000);
              });
          }
        });
      })
      .catch((error) => {
        console.error('Error validating institutionId:', error);
        setValidationError('Error validating institutionId');
        setIsValidating(false);
      });
  }, [router.isReady, institutionId, courseId, instanceIdOrLatest, router]);

  if (validationError && !isValidating && !loadingInstanceId) {
    return (
      <MainLayout title="Error | ALeA">
        <Box sx={{ textAlign: 'center', mt: 10, px: 2 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (!router.isReady || !courses || isValidating || loadingInstanceId || !resolvedInstanceId) {
    return <CircularProgress />;
  }
  
  const courseInfo = courses[courseId];
  if (!courseInfo) {
    router.replace('/');
    return <>Course Not Found!</>;
  }
  
  return (
    <MainLayout title={(courseId || '').toUpperCase() + ` ${t.forum} | ALeA`}>
      <CourseHeader
        courseName={courseInfo.courseName}
        imageLink={courseInfo.imageLink}
        courseId={courseId}
      />
      <Box maxWidth="800px" m="auto" px="10px">
        {threadId ? (
          <ThreadView 
            threadId={threadId} 
            courseId={courseId}
            institutionId={institutionId}
            instanceId={resolvedInstanceId}
          />
        ) : (
          <ForumView 
            courseId={courseId}
            institutionId={institutionId}
            instanceId={resolvedInstanceId}
          />
        )}
      </Box>
    </MainLayout>
  );
};

export default ForumPage;
