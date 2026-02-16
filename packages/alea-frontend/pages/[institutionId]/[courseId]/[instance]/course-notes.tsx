/* eslint-disable react/display-name, react/no-children-prop */
import { CommentButton } from '@alea/comments';
import { getAllCourses, getCoverageTimeline } from '@alea/spec';
import {
  NOT_COVERED_SECTIONS,
  SafeFTMLDocument,
  SectionReview,
  TrafficLightIndicator,
} from '@alea/stex-react-renderer';
import { CourseInfo, LectureEntry } from '@alea/utils';
import { FTML } from '@flexiformal/ftml';
import { contentToc } from '@flexiformal/ftml-backend';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
} from '@mui/material';
import axios from 'axios';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { ReactNode, useEffect, useRef, useState } from 'react';
import SearchCourseNotes from '../../components/SearchCourseNotes';
import MainLayout from '../../layouts/MainLayout';

export const SearchDialog = ({ open, onClose, courseId, notesUri, hasResults, setHasResults }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={hasResults ? 'lg' : 'md'}>
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', color: 'text.primary' }}>
        {courseId.toUpperCase()}
      </DialogTitle>
      <DialogContent sx={{ p: 1 }}>
        <SearchCourseNotes
          courseId={courseId || ''}
          notesUri={notesUri}
          onClose={onClose}
          setHasResults={setHasResults}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const FragmentWrap: React.FC<{
  uri: string;
  fragmentKind: 'Section' | 'Slide' | 'Paragraph';
  children: ReactNode;
  uriToTitle: Record<string, string>;
}> = ({ uri, fragmentKind, children, uriToTitle }) => {
  const notCovered = Object.values(NOT_COVERED_SECTIONS).flat().includes(uri);

  return (
    <Box
      fragment-uri={uri}
      fragment-kind={fragmentKind}
      bgcolor={notCovered ? '#fdd' : undefined}
      title={notCovered ? 'Not Covered' : undefined}
    >
      {fragmentKind === 'Section' ? (
        <>
          {children}
          <SectionReview sectionUri={uri} sectionTitle={uriToTitle[uri] ?? ''} />
        </>
      ) : (
        <Box display="flex" justifyContent="space-between">
          <Box flex={1}>{children}</Box>

          <Box
            onMouseUp={() => {
              const text = getSelectedText();
              if (text) {
                localStorage.setItem('lastSelectedText', text);
              }
            }}
          >
            <CommentButton url={uri} fragmentKind={fragmentKind} />
          </Box>
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
  const courseId = router.query.courseId as string;
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo } | undefined>(undefined);
  const [gottos, setGottos] = useState<{ uri: string; timestamp: number }[] | undefined>(undefined);
  const [toc, setToc] = useState<FTML.TocElem[] | undefined>(undefined);

  const uriToTitle = useRef<Record<string, string>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditableTarget =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          (target as HTMLElement).isContentEditable);

      if (isEditableTarget) return;

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setDialogOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    getAllCourses().then(setCourses);
  }, []);

  useEffect(() => {
    const notes = courses?.[courseId ?? '']?.notes;
    if (!notes) return;

    setToc(undefined);

    contentToc({ uri: notes }).then(([css, toc] = [[], []]) => {
      setToc(toc);
      uriToTitle.current = {};
      getSectionUriToTitle(toc, uriToTitle.current);
    });
  }, [router.isReady, courses, courseId]);

  useEffect(() => {
    if (!router.asPath.includes('#')) return;
    if (!toc) return;

    const sectionId = decodeURIComponent(router.asPath.split('#')[1]);
    if (!sectionId) return;

    requestAnimationFrame(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }, [toc, router.asPath]);

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

  if (isValidating) {
    return null;
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

  if (!institutionId || !courseId || !resolvedInstanceId) {
    return <CourseNotFound />;
  }

  if (!router.isReady || !courses || !gottos || !toc) {
    return <CircularProgress />;
  }

  const courseInfo = courses[courseId];
  if (!courseInfo) {
    return <CourseNotFound />;
  }

  const { notes } = courseInfo;

  return (
    <MainLayout title={courseId.toUpperCase()}>
      <Tooltip title="Search (Ctrl+Shift+F)" placement="left-start">
        <IconButton
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 64,
            right: 24,
            zIndex: 1000,
            bgcolor: 'white',
            boxShadow: 3,
            '&:hover': {
              bgcolor: 'primary.300',
            },
          }}
          onClick={() => setDialogOpen(true)}
          size="large"
          aria-label="Open search dialog"
        >
          <SearchIcon fontSize="large" sx={{ opacity: 0.5 }} />
        </IconButton>
      </Tooltip>
      <SearchDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        courseId={courseId}
        notesUri={notes}
        hasResults={hasResults}
        setHasResults={setHasResults}
      />
      <Box
        sx={{
          height: 'calc(100vh - 120px)',
          overflow: 'auto',
          position: 'relative',
          bgcolor:'white'
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
