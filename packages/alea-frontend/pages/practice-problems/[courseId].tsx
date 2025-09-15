import { CircularProgress } from '@mui/material';
import { getCourseInfo } from '@alea/spec';
import { FTML } from '@kwarc/ftml-viewer';
import { CourseInfo } from '@alea/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ProblemList from '../../components/ProblemList';
import MainLayout from '../../layouts/MainLayout';
import { getFlamsServer } from '@kwarc/ftml-react';

const CourseProblemsPage: NextPage = () => {
  const router = useRouter();
  const courseId = router.query.courseId as string;

  const [courses, setCourses] = useState<{ [id: string]: CourseInfo } | undefined>(undefined);
  const [sectionsData, setSectionsData] = useState<FTML.TOCElem[] | undefined>(undefined);

  useEffect(() => {
    getCourseInfo().then(setCourses);
  }, []);

  useEffect(() => {
    async function fetchSectionData() {
      if (!courses || !courseId) return;
      const courseInfo = courses?.[courseId];
      if (!courseInfo) {
        router.replace('/');
        return;
      }
      const { notes } = courseInfo;
      const tocContent = (await getFlamsServer().contentToc({ uri: notes }))?.[1] ?? [];
      setSectionsData(tocContent);
    }
    fetchSectionData();
  }, [courses, courseId, router]);

  if (!router.isReady || !courses) return <CircularProgress />;
  if (!sectionsData) return <CircularProgress />;

  return (
    <MainLayout title={`${(courseId || '').toUpperCase()} Problems | ALeA`}>
      <ProblemList courseSections={sectionsData} courseId={courseId} />
    </MainLayout>
  );
};

export default CourseProblemsPage;