import { CircularProgress } from '@mui/material';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import ProblemList from '../../components/ProblemList';
import MainLayout from '../../layouts/MainLayout';
import { useContentToc } from '../../hooks/useContentToc';
import { useAllCourses } from '../../hooks/useAllCourses';

const CourseProblemsPage: NextPage = () => {
  const router = useRouter();
  const courseId = router.query.courseId as string;
  const { data: courses = {}, isLoading: isCourseLoading } = useAllCourses();
  const courseInfo = courses?.[courseId];
  useEffect(() => {
    if (courseId && !courseInfo) {
      router.replace('/');
    }
  }, [courseId, courseInfo, router]);

  const { data: sectionsData = [], isLoading: sectionDataLoading } = useContentToc(
    courseInfo?.notes
  );
  if (!router.isReady || isCourseLoading || sectionDataLoading) return <CircularProgress />;

  return (
    <MainLayout title={`${(courseId || '').toUpperCase()} Problems | ALeA`}>
      <ProblemList courseSections={sectionsData} courseId={courseId} />
    </MainLayout>
  );
};

export default CourseProblemsPage;
