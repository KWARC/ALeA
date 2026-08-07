import { FTML, FTMLDocument, FTMLSetup, getFlamsServer } from '@kwarc/ftml-react';
import { Box, CircularProgress } from '@mui/material';
import { getCourseInfo } from '@stex-react/api';
import { CourseInfo } from '@stex-react/utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import DrawingComponent from '../../components/DrawingInput';
import { useEffect, useState } from 'react';

const CourseTakingNote: NextPage = () => {
  const router = useRouter();
  const courseId = router.query.courseId as string;
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo } | undefined>(undefined);
  const [toc, setToc] = useState<FTML.TOCElem[] | undefined>(undefined);
  useEffect(() => {
    getCourseInfo().then(setCourses);
  }, []);
  useEffect(() => {
    const notes = courses?.[courseId]?.notes;
    if (!notes) return;
    setToc(undefined);
    getFlamsServer()
      .contentToc({ uri: notes })
      .then(([css, toc] = [[], []]) => {
        setToc(toc);
      });
  }, [router.isReady, courses, courseId]);
  if (!router.isReady || !courses || !toc) {
    return <CircularProgress />;
  }
  const courseInfo = courses[courseId];
  const { notes } = courseInfo;

  return (
    <>
      <FTMLSetup>
        <FTMLDocument
          key={notes}
          document={{ type: 'FromBackend', uri: notes, toc: { Predefined: toc } }}
          onFragment={(uri, kind) => {
            if (kind.type === 'Slide')
              return (ch) => (
                <Box display="flex" justifyContent="space-between">
                    <DrawingComponent id={uri}>
                  <Box flex={1}>{ch}</Box>
                  </DrawingComponent>
                </Box>
              );
            return;
          }}
        ></FTMLDocument>
      </FTMLSetup>
    </>
  );
};
export default CourseTakingNote;
