import SchoolIcon from '@mui/icons-material/School';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import Alert from '@mui/material/Alert';
import { canAccessResource, getUserInfo } from '@alea/spec';
import { Action, CourseInfo, isFauId, ResourceName } from '@alea/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { ForceFauLogin } from '../../../../components/ForceFAULogin';
import HomeworkPerformanceTable from '../../../../components/HomeworkPerformanceTable';
import { RouteErrorDisplay } from '../../../../components/RouteErrorDisplay';
import { useRouteValidation } from '../../../../hooks/useRouteValidation';
import { getLocaleObject } from '../../../../lang/utils';
import MainLayout from '../../../../layouts/MainLayout';
import { CourseHeader, handleEnrollment } from '../../../course-home/[courseId]';

const HomeworkPage: NextPage = () => {
  const router = useRouter();
  
  const {
    institutionId,
    courseId,
    instanceIdOrLatest,
    resolvedInstanceId,
    courses,
    validationError,
    isValidating,
    loadingInstanceId,
  } = useRouteValidation('homework');

  const { homework: t, home: tHome, quiz: q } = getLocaleObject(router);
  const [forceFauLogin, setForceFauLogin] = useState(false);
  const [userId, setUserId] = useState(null);
  const [enrolled, setIsEnrolled] = useState<boolean | undefined>(undefined);

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
      <RouteErrorDisplay
        validationError={validationError}
        institutionId={institutionId}
        courseId={courseId}
        instanceIdOrLatest={instanceIdOrLatest}
      />
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
