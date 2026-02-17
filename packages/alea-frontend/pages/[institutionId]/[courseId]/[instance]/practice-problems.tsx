import { CircularProgress } from '@mui/material';
import { getAllCourses } from '@alea/spec';
import { FTML } from '@flexiformal/ftml';
import { CourseInfo } from '@alea/utils';
import { contentToc } from '@flexiformal/ftml-backend';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ProblemList from '../../../../components/ProblemList';
import { RouteErrorDisplay } from '../../../../components/RouteErrorDisplay';
import { CourseNotFound } from '../../../../components/CourseNotFound';
import { useRouteValidation } from '../../../../hooks/useRouteValidation';
import MainLayout from '../../../../layouts/MainLayout';

const PracticeProblemsPage: NextPage = () => {
  const router = useRouter();
  const {
    institutionId,
    courseId,
    instance,
    resolvedInstanceId,
    validationError,
    isValidating,
  } = useRouteValidation('practice-problems');

  const [courses, setCourses] = useState<{ [id: string]: CourseInfo } | undefined>(undefined);
  const [sectionsData, setSectionsData] = useState<FTML.TocElem[] | undefined>(undefined);

  useEffect(() => {
    getAllCourses().then(setCourses);
  }, []);

  useEffect(() => {
    async function fetchSectionData() {
      if (!courses || !courseId) return;
      const courseInfo = courses[courseId];
      if (!courseInfo) return;
      const { notes } = courseInfo;
      const tocContent = (await contentToc({ uri: notes }))?.[2] ?? [];
      setSectionsData(tocContent);
    }
    fetchSectionData();
  }, [courses, courseId]);

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
  if (!sectionsData) return <CircularProgress />;

  const courseInfo = courses[courseId];
  if (!courseInfo) return <CourseNotFound />;

  return (
    <MainLayout title={`${(courseId || '').toUpperCase()} Problems | ALeA`}>
      <ProblemList courseSections={sectionsData} courseId={courseId} />
    </MainLayout>
  );
};

export default PracticeProblemsPage;
