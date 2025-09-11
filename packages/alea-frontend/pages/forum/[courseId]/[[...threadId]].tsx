import { Box, CircularProgress } from '@mui/material';
import { getCourseInfo } from '@stex-react/spec';
import { CourseInfo } from '@stex-react/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { ForumView } from '../../../components/ForumView';
import { ThreadView } from '../../../components/ThreadView';
import { getLocaleObject } from '../../../lang/utils';
import MainLayout from '../../../layouts/MainLayout';
import { CourseHeader } from '../../course-home/[courseId]';

const ForumPage: NextPage = () => {
  const router = useRouter();
  const { home } = getLocaleObject(router);
  const t = home.courseThumb;
  const courseId = router?.query?.courseId as string;
  const threadId = +(router?.query?.threadId?.[0] as string);
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
  return (
    <MainLayout title={(courseId || '').toUpperCase() + ` ${t.forum} | ALeA`}>
      <CourseHeader
        courseName={courseInfo.courseName}
        imageLink={courseInfo.imageLink}
        courseId={courseId}
      />
      <Box maxWidth="800px" m="auto" px="10px">
        {threadId ? <ThreadView threadId={threadId} courseId={courseId} /> : <ForumView />}
      </Box>
    </MainLayout>
  );
};

export default ForumPage;
