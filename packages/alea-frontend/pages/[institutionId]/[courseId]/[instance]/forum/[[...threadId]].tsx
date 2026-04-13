import { Box, CircularProgress } from '@mui/material';
import { getAllCourses } from '@alea/spec';
import { CourseInfo } from '@alea/utils';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { RouteErrorDisplay } from '../../../../../components/RouteErrorDisplay';
import { CourseNotFound } from '../../../../../components/CourseNotFound';
import { ForumView } from '../../../../../components/ForumView';
import { ThreadView } from '../../../../../components/ThreadView';
import { CourseHeader } from '../../../../../components/CourseHeader';
import { useRouteValidation } from '../../../../../hooks/useRouteValidation';
import { getLocaleObject } from '../../../../../lang/utils';
import MainLayout from '../../../../../layouts/MainLayout';

const ForumPage: NextPage = () => {
  const router = useRouter();
  const {
    institutionId,
    courseId,
    instance,
    resolvedInstanceId,
    validationError,
    isValidating,
  } = useRouteValidation('forum');

  const raw = router?.query?.threadId;
  const threadId = +(Array.isArray(raw) ? raw[0] : raw ?? 0);
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo } | undefined>(undefined);
  const { home } = getLocaleObject(router);
  const t = home.courseThumb;

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

  return (
    <MainLayout title={(courseId || '').toUpperCase() + ` ${t.forum} | ALeA`}>
      <CourseHeader
        courseName={courseInfo.courseName}
        imageLink={courseInfo.imageLink}
        courseId={courseId}
        institutionId={institutionId}
        instanceId={resolvedInstanceId}
      />
      <Box maxWidth="800px" m="auto" px="10px">
        {threadId ? <ThreadView threadId={threadId} courseId={courseId} /> : <ForumView />}
      </Box>
    </MainLayout>
  );
};

export default ForumPage;
