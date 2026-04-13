import { Box } from '@mui/material';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { DrillConfigurator } from '../../../../components/DrillConfigurator';
import { RouteErrorDisplay } from '../../../../components/RouteErrorDisplay';
import { CourseNotFound } from '../../../../components/CourseNotFound';
import { useRouteValidation } from '../../../../hooks/useRouteValidation';
import { getLocaleObject } from '../../../../lang/utils';
import MainLayout from '../../../../layouts/MainLayout';

const FlashCardsPage: NextPage = () => {
  const router = useRouter();
  const {
    institutionId,
    courseId,
    instance,
    resolvedInstanceId,
    validationError,
    isValidating,
  } = useRouteValidation('flash-cards');
  const { home } = getLocaleObject(router);
  const t = home.courseThumb;

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

  return (
    <MainLayout title={(courseId || '').toUpperCase() + ` ${t.cards} | ALeA`}>
      <Box m="0 auto">
        <DrillConfigurator courseId={courseId} />
      </Box>
    </MainLayout>
  );
};

export default FlashCardsPage;
