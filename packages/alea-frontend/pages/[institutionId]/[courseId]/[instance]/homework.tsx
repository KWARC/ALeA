import SchoolIcon from '@mui/icons-material/School';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import Alert from '@mui/material/Alert';
import { canAccessResource, getAllCourses } from '@alea/spec';
import { Action, CourseInfo, isFauId, ResourceName } from '@alea/utils';
import { useCurrentUser } from '@alea/react-utils';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { RouteErrorDisplay } from '../../../../components/RouteErrorDisplay';
import { CourseNotFound } from '../../../../components/CourseNotFound';
import { ForceFauLogin } from '../../../../components/ForceFAULogin';
import HomeworkPerformanceTable from '../../../../components/HomeworkPerformanceTable';
import { CourseHeader } from '../../../../components/CourseHeader';
import { handleEnrollment } from '../../../../components/courseHelpers';
import { useRouteValidation } from '../../../../hooks/useRouteValidation';
import { getLocaleObject } from '../../../../lang/utils';
import MainLayout from '../../../../layouts/MainLayout';

const HomeworkPage: NextPage = () => {
  const router = useRouter();
  const {
    institutionId,
    courseId,
    instance,
    resolvedInstanceId,
    validationError,
    isValidating,
  } = useRouteValidation('homework');

  const currentTerm = resolvedInstanceId;
  const { homework: t, home: tHome, quiz: q } = getLocaleObject(router);

  const [courses, setCourses] = useState<{ [id: string]: CourseInfo } | undefined>(undefined);
  const [forceFauLogin, setForceFauLogin] = useState(false);
  const [enrolled, setIsEnrolled] = useState<boolean | undefined>(undefined);

  const { user } = useCurrentUser();
  const userId = user?.userId;

  useEffect(() => {
    const uid = user?.userId;
    if (!uid) return;
    isFauId(uid) ? setForceFauLogin(false) : setForceFauLogin(true);
  }, [user]);

  useEffect(() => {
    if (!courseId || !currentTerm) return;
    const checkAccess = async () => {
      const hasAccess = await canAccessResource(ResourceName.COURSE_HOMEWORK, Action.TAKE, {
        courseId,
        instanceId: currentTerm,
      });
      setIsEnrolled(hasAccess);
    };
    checkAccess();
  }, [courseId, currentTerm]);

  useEffect(() => {
    getAllCourses().then(setCourses);
  }, []);

  if (isValidating) return null;
  if (validationError) {
    return (
      <RouteErrorDisplay
        validationError={validationError}
        institutionId={institutionId}
        courseId={courseId}
        instance={instance}
      />
    );
  }
  if (!institutionId || !courseId || !resolvedInstanceId) return <CourseNotFound />;

  if (!router.isReady || !courses) return <CircularProgress />;

  const courseInfo = courses[courseId];
  if (!courseInfo) return <CourseNotFound />;

  if (forceFauLogin) {
    return (
      <MainLayout title={(courseId || '').toUpperCase() + ` ${tHome.courseThumb.homeworks} | ALeA`}>
        <ForceFauLogin content="homework" />
      </MainLayout>
    );
  }

  const enrollInCourse = async () => {
    if (!userId || !courseId || !currentTerm) return router.push('/login');
    const enrollmentSuccess = await handleEnrollment(userId, courseId, currentTerm);
    if (enrollmentSuccess) setIsEnrolled(true);
  };

  return (
    <MainLayout title={(courseId || '').toUpperCase() + ` ${tHome.courseThumb.homeworks} | ALeA`}>
      <CourseHeader
        courseName={courseInfo.courseName}
        imageLink={courseInfo.imageLink}
        courseId={courseId}
        institutionId={institutionId}
        instanceId={resolvedInstanceId}
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
