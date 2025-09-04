import { Button, CircularProgress } from '@mui/material';
import { getCourseInfo } from '@stex-react/spec';
import { DocProblemBrowser } from '@stex-react/stex-react-renderer';
import { CourseInfo } from '@stex-react/utils';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getLocaleObject } from '../../lang/utils';
import MainLayout from '../../layouts/MainLayout';

const CourseProblemsPage: NextPage = () => {
  const router = useRouter();
  const { home } = getLocaleObject(router);
  const t = home.courseThumb;
  const courseId = router.query.courseId as string;
  const startSecNameExcl = router.query.startSecNameExcl as string;
  const endSecNameIncl = router.query.endSecNameIncl as string;
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo } | undefined>(undefined);

  useEffect(() => {
    getCourseInfo().then(setCourses);
  }, []);

  if (!router.isReady || !courses) return <CircularProgress />;
  const courseInfo = courses[courseId];
  if (!courseInfo) {
    router.replace('/');
    return <>Course Not Found!</>;
  }
  const notesDocUri = courseInfo.notes;

  return (
    <MainLayout title={(courseId || '').toUpperCase() + ` ${t.notes} | ALeA`}>
      {startSecNameExcl && endSecNameIncl && (
        <Button
          variant="contained"
          sx={{
            position: 'absolute',
            right: '5px',
            top: '10px',
            zIndex: '100',
          }}
          onClick={() => {
            router.push({ pathname: router.pathname, query: { courseId } });
          }}
        >
          See all problems
        </Button>
      )}
      <DocProblemBrowser
        notesDocUri={notesDocUri}
        courseId={courseId}
        topOffset={64}
        startSecNameExcl={startSecNameExcl}
        endSecNameIncl={endSecNameIncl}
      />
    </MainLayout>
  );
};
export default CourseProblemsPage;
