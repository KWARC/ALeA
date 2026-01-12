import SchoolIcon from '@mui/icons-material/School';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import Alert from '@mui/material/Alert';
import { canAccessResource, getAllCourses, getUserInfo, getLatestInstance, validateInstitution, validateInstance } from '@alea/spec';
import { Action, CourseInfo, isFauId, ResourceName } from '@alea/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { ForceFauLogin } from '../../../../components/ForceFAULogin';
import HomeworkPerformanceTable from '../../../../components/HomeworkPerformanceTable';
import { getLocaleObject } from '../../../../lang/utils';
import MainLayout from '../../../../layouts/MainLayout';
import { CourseHeader, handleEnrollment } from '../../../course-home/[courseId]';

const HomeworkPage: NextPage = () => {
  const router = useRouter();
  
  const rawInstitutionId = router.query.institutionId as string;
  const courseId = router.query.courseId as string;
  const instanceIdOrLatest = router.query.instanceIdOrLatest as string;
  
  const institutionId = rawInstitutionId?.toUpperCase() || '';
  
  const { homework: t, home: tHome, quiz: q } = getLocaleObject(router);

  const [courses, setCourses] = useState<{ [id: string]: CourseInfo } | undefined>(undefined);
  const [forceFauLogin, setForceFauLogin] = useState(false);
  const [userId, setUserId] = useState(null);
  const [enrolled, setIsEnrolled] = useState<boolean | undefined>(undefined);
  
  const [resolvedInstanceId, setResolvedInstanceId] = useState<string | null>(null);
  const [loadingInstanceId, setLoadingInstanceId] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    if (!router.isReady || !rawInstitutionId || !courseId || !instanceIdOrLatest) return;
    if (rawInstitutionId !== institutionId) {
      const queryString = router.asPath.includes('?') ? router.asPath.split('?')[1] : '';
      const normalizedPath = `/${institutionId}/${courseId}/${instanceIdOrLatest}/homework${queryString ? `?${queryString}` : ''}`;
      router.replace(normalizedPath);
      return;
    }
  }, [router.isReady, rawInstitutionId, institutionId, courseId, instanceIdOrLatest, router]);

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

  useEffect(() => {
    getUserInfo().then((i) => {
      const uid = i?.userId;
      if (!uid) return;
      setUserId(uid);
      isFauId(uid) ? setForceFauLogin(false) : setForceFauLogin(true);
    });
  });

  useEffect(() => {
    if (!courseId || !resolvedInstanceId) return;
    const checkAccess = async () => {
      const hasAccess = await canAccessResource(ResourceName.COURSE_HOMEWORK, Action.TAKE, {
        courseId,
        instanceId: resolvedInstanceId,
      });
      setIsEnrolled(hasAccess);
    };
    checkAccess();
  }, [courseId, resolvedInstanceId]);

  if (validationError && !isValidating && !loadingInstanceId) {
    return (
      <MainLayout title="Error | ALeA">
        <Box sx={{ textAlign: 'center', mt: 10 }}>
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

  if (forceFauLogin) {
    return (
      <MainLayout
        title={(courseId || '').toUpperCase() + ` ${tHome.courseThumb.homeworks} | ALeA`}
      >
        <ForceFauLogin content={"homework"} />
      </MainLayout>
    );
  }
  
  const enrollInCourse = async () => {
    if (!userId || !courseId || !resolvedInstanceId) {
      return router.push('/login');
    }
    const enrollmentSuccess = await handleEnrollment(userId, courseId, resolvedInstanceId);
    if (enrollmentSuccess) setIsEnrolled(true);
  };

  return (
    <MainLayout title={(courseId || '').toUpperCase() + ` ${tHome.courseThumb.homeworks} | ALeA`}>
      <CourseHeader
        courseName={courseInfo.courseName}
        imageLink={courseInfo.imageLink}
        courseId={courseId}
      />
      <Box maxWidth="900px" m="auto" px="10px">
        {enrolled === false && <Alert severity="info">{q.enrollmentMessage}</Alert>}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', m: '30px 0 15px' }}>
          <Typography variant="h4">{t.homeworkDashboard}</Typography>
          {enrolled === false && (
            <Button onClick={enrollInCourse} variant="contained" sx={{ backgroundColor: 'green' }}>
              {q.getEnrolled}
              <SchoolIcon />
            </Button>
          )}
        </Box>
        <Typography variant="body1" sx={{ color: '#333' }}>
          {t.homeworkDashboardDescription.replace('{courseId}', courseId.toUpperCase())}
        </Typography>
        {enrolled && <HomeworkPerformanceTable courseId={courseId} />}
      </Box>
    </MainLayout>
  );
};

export default HomeworkPage;
