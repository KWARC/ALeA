/* eslint-disable react/display-name, react/no-children-prop */
import { CommentButton } from '@alea/comments';
import { getAllCourses } from '@alea/spec';
import {
  NOT_COVERED_SECTIONS,
  SafeFTMLDocument,
  SectionReview,
  TrafficLightIndicator,
} from '@alea/stex-react-renderer';
import { CourseInfo, LectureEntry, PRIMARY_COL } from '@alea/utils';
import { FTML } from '@flexiformal/ftml';
import { contentToc } from '@flexiformal/ftml-backend';
import {
  Box,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { getLocaleObject } from 'packages/alea-frontend/lang/utils';
import { ReactNode, useEffect, useRef, useState } from 'react';
import MainLayout from '../../../../layouts/MainLayout';
import { useRouteValidation } from '../../../../hooks/useRouteValidation';
import { RouteErrorDisplay } from '../../../../components/RouteErrorDisplay';
import { CourseNotFound } from '../../../../components/CourseNotFound';

export const SearchDialog = ({ open, onClose, courseId, notesUri, hasResults, setHasResults }) => {
  return null; // Placeholder - implement if needed
};

const FragmentWrap: React.FC<{
  uri: string;
  fragmentKind: 'Section' | 'Slide' | 'Paragraph';
  children: ReactNode;
  uriToTitle: Record<string, string>;
}> = ({ uri, fragmentKind, children, uriToTitle }) => {
  const { courseNotes: t } = getLocaleObject(useRouter());
  const notCovered = Object.values(NOT_COVERED_SECTIONS).flat().includes(uri);
  return (
    <Box
      fragment-uri={uri}
      fragment-kind={fragmentKind}
      bgcolor={notCovered ? '#fdd' : undefined}
      title={notCovered ? t.notCovered : undefined}
    >
      {fragmentKind === 'Section' ? (
        <>
          {children}
          <SectionReview sectionUri={uri} sectionTitle={uriToTitle[uri] ?? ''} />
        </>
      ) : (
        <Box display="flex" justifyContent="space-between">
          <Box flex={1}>{children}</Box>
          <CommentButton url={uri} fragmentKind={fragmentKind} />
        </Box>
      )}
    </Box>
  );
};

function getSectionUriToTitle(toc: FTML.TocElem[], uriToTitle: Record<string, string>) {
  for (const elem of toc) {
    if (elem.type === 'Section') {
      uriToTitle[elem.uri] = elem.title;
    }
    if ('children' in elem) {
      getSectionUriToTitle(elem.children, uriToTitle);
    }
  }
}

const CourseNotesPage: NextPage = () => {
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
  } = useRouteValidation('course-notes');

  const [gottos, setGottos] = useState<{ uri: string; timestamp: number }[] | undefined>(undefined);
  const [toc, setToc] = useState<FTML.TocElem[] | undefined>(undefined);
  const uriToTitle = useRef<Record<string, string>>({});

  useEffect(() => {
    getAllCourses().then(() => {});
  }, []);

  useEffect(() => {
    const notes = courses?.[courseId]?.notes;
    if (!notes) return;
    setToc(undefined);
    contentToc({ uri: notes }).then(([css, toc] = [[], []]) => {
      setToc(toc);
      uriToTitle.current = {};
      getSectionUriToTitle(toc, uriToTitle.current);
    });
  }, [courses, courseId]);

  useEffect(() => {
    async function fetchGottos() {
      try {
        const response = await axios.get('/api/get-coverage-timeline');
        const currentSemData: LectureEntry[] = response.data[courseId] || [];
        const coverageData = currentSemData
          .filter((item) => item.sectionUri)
          .map((item) => ({
            uri: item.sectionUri,
            timestamp: item.timestamp_ms,
          }));
        setGottos(coverageData);
      } catch (error) {
        setGottos([]);
        console.error('Error fetching gottos:', error);
      }
    }
    if (courseId) fetchGottos();
  }, [courseId]);

  if (isValidating || loadingInstanceId || !courses || !gottos || !toc) {
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

  const courseInfo = courses[courseId];
  if (!courseInfo || !resolvedInstanceId) {
    return <CourseNotFound bgColor={undefined} />;
  }

  const { notes } = courseInfo;

  return (
    <MainLayout title={courseId.toUpperCase()}>
      <Box
        sx={{
          height: 'calc(100vh - 120px)',
          overflow: 'auto',
          position: 'relative',
        }}
      >
        <SafeFTMLDocument
          allowFullscreen={false}
          key={notes}
          document={{ type: 'FromBackend', uri: notes }}
          toc={{ Ready: toc }}
          tocProgress={gottos}
          sectionWrap={(uri, _) => {
            return (ch) => (
              <FragmentWrap
                uri={uri}
                fragmentKind={'Section'}
                children={ch}
                uriToTitle={uriToTitle.current}
              />
            );
          }}
          slideWrap={(uri) => {
            return (ch) => (
              <FragmentWrap
                uri={uri}
                fragmentKind={'Slide'}
                children={ch}
                uriToTitle={uriToTitle.current}
              />
            );
          }}
          paragraphWrap={(uri, kind) => {
            if (kind === 'Paragraph') {
              return (ch) => (
                <FragmentWrap
                  uri={uri}
                  fragmentKind={'Paragraph'}
                  children={ch}
                  uriToTitle={uriToTitle.current}
                />
              );
            }
          }}
          onSectionTitle={(uri, lvl) => <TrafficLightIndicator sectionUri={uri} />}
        />
      </Box>
    </MainLayout>
  );
};

export default CourseNotesPage;
