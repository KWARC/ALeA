import { CircularProgress } from '@mui/material';
import { getAllCourses } from '@alea/spec';
import { FTML } from '@flexiformal/ftml';
import { CourseInfo } from '@alea/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ProblemList from '../../../../components/ProblemList';
import MainLayout from '../../../../layouts/MainLayout';
import { contentToc } from '@flexiformal/ftml-backend';
import { useRouteValidation } from '../../../../hooks/useRouteValidation';
import { RouteErrorDisplay } from '../../../../components/RouteErrorDisplay';
import { CourseNotFound } from '../../../../components/CourseNotFound';
import { Box, Typography } from '@mui/material';

const CourseProblemsPage: NextPage = () => {
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
  } = useRouteValidation('practice-problems');

  const [sectionsData, setSectionsData] = useState<FTML.TocElem[] | undefined>(undefined);

  useEffect(() => {
    async function fetchSectionData() {
      if (!courses || !courseId) return;
      const courseInfo = courses?.[courseId];
      if (!courseInfo) {
        return;
      }
      const { notes } = courseInfo;
      const tocContent = (await contentToc({ uri: notes }))?.[1] ?? [];
      setSectionsData(tocContent);
    }
    fetchSectionData();
  }, [courses, courseId]);

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

  if (!sectionsData) {
    return (
      <MainLayout title="Loading... | ALeA">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  const courseInfo = courses[courseId];
  if (!courseInfo || !resolvedInstanceId) {
    return <CourseNotFound />;
  }

  return (
    <MainLayout title={`${(courseId || '').toUpperCase()} Problems | ALeA`}>
      <ProblemList courseSections={sectionsData} courseId={courseId} />
    </MainLayout>
  );
};

export default CourseProblemsPage;
