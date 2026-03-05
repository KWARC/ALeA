import { CircularProgress } from '@mui/material';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import ProblemList from '../../../../components/ProblemList';
import { RouteErrorDisplay } from '../../../../components/RouteErrorDisplay';
import { CourseNotFound } from '../../../../components/CourseNotFound';
import { useRouteValidation } from '../../../../hooks/useRouteValidation';
import MainLayout from '../../../../layouts/MainLayout';
import { useAllCourses } from '../../../../hooks/useAllCourses';
import { useContentToc } from '../../../../hooks/useContentToc';

const PracticeProblemsPage: NextPage = () => {
  const router = useRouter();
  const { institutionId, courseId, instance, resolvedInstanceId, validationError, isValidating } =
    useRouteValidation('practice-problems');
  const { data: courses = {}, isLoading: isCourseLoading } = useAllCourses();
  const courseInfo = courses?.[courseId];
  const { data: sectionsData = [], isLoading: sectionDataLoading } = useContentToc(
    courseInfo?.notes
  );
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
  if (!router.isReady || isCourseLoading) return <CircularProgress />;
  if (!courseInfo) return <CourseNotFound />;
  if (sectionDataLoading) return <CircularProgress />;

  return (
    <MainLayout title={`${(courseId || '').toUpperCase()} Problems | ALeA`}>
      <ProblemList courseSections={sectionsData} courseId={courseId} />
    </MainLayout>
  );
};

export default PracticeProblemsPage;
