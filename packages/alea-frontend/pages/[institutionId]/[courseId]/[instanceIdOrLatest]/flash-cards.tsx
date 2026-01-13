import { DrillConfigurator } from '../../../../components/DrillConfigurator';
import { RouteErrorDisplay } from '../../../../components/RouteErrorDisplay';
import { useRouteValidation } from '../../../../hooks/useRouteValidation';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { CircularProgress } from '@mui/material';
import MainLayout from '../../../../layouts/MainLayout';
import { Box } from '@mui/material';
import { getLocaleObject } from '../../../../lang/utils';

const FlashCardCoursePage: NextPage = () => {
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
  } = useRouteValidation('flash-cards');

  const { home } = getLocaleObject(router);
  const t = home.courseThumb;

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

  if (!router.isReady || isValidating || loadingInstanceId || !resolvedInstanceId || !courses || !courses[courseId]) {
    return <CircularProgress />;
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
