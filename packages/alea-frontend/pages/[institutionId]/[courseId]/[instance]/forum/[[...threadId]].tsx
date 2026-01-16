import { Box, CircularProgress, Typography } from '@mui/material';
import { getAllCourses } from '@alea/spec';
import { CourseInfo } from '@alea/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { ForumView } from '../../../../../components/ForumView';
import { ThreadView } from '../../../../../components/ThreadView';
import { getLocaleObject } from '../../../../../lang/utils';
import MainLayout from '../../../../../layouts/MainLayout';
import { CourseHeader } from '../../../../../components/CourseHeader';
import { useRouteValidation } from '../../../../../hooks/useRouteValidation';
import { RouteErrorDisplay } from '../../../../../components/RouteErrorDisplay';
import { CourseNotFound } from '../../../../../components/CourseNotFound';

const ForumPage: NextPage = () => {
  const router = useRouter();
  const {
    institutionId,
    courseId,
    instance,
    resolvedInstanceId,
    courses,
    validationError,
    isValidating,
    loadingInstanceId,
  } = useRouteValidation('forum');

  const { home } = getLocaleObject(router);
  const t = home.courseThumb;
  const threadId = +(router?.query?.threadId?.[0] as string);

  useEffect(() => {
    getAllCourses().then(() => {});
  }, []);

  if (isValidating || loadingInstanceId || !courses) {
    return (
      <MainLayout title="Loading... | ALeA">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

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

  const courseInfo = courses[courseId];
  if (!courseInfo || !resolvedInstanceId) {
    return <CourseNotFound bgColor={undefined} />;
  }

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
