import { DrillConfigurator } from '../../../../components/DrillConfigurator';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import MainLayout from '../../../../layouts/MainLayout';
import { Box, CircularProgress, Typography } from '@mui/material';
import { getLocaleObject } from '../../../../lang/utils';
import { useRouteValidation } from '../../../../hooks/useRouteValidation';
import { RouteErrorDisplay } from '../../../../components/RouteErrorDisplay';
import { CourseNotFound } from '../../../../components/CourseNotFound';

const FlashCardCoursePage: NextPage = () => {
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
  } = useRouteValidation('flash-cards');

  const { home } = getLocaleObject(router);
  const t = home.courseThumb;

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
    <MainLayout
      title={(courseId || '').toUpperCase() + ` ${t.cards} | ALeA`}
    >
      <Box m="0 auto">
        <DrillConfigurator courseId={courseId} />
      </Box>
    </MainLayout>
  );
};

export default FlashCardCoursePage;
