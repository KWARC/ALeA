import { FTMLDocument, FTMLSetup, getFlamsServer } from '@kwarc/ftml-react';
import { FTML } from '@kwarc/ftml-viewer';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import { getCourseInfo } from '@alea/spec';
import { CommentButton } from '@alea/comments';
import { SectionReview, TrafficLightIndicator } from '@alea/stex-react-renderer';
import { CourseInfo, LectureEntry, PRIMARY_COL } from '@alea/utils';
import axios from 'axios';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { ReactNode, useEffect, useRef, useState } from 'react';
import SearchCourseNotes from '../../components/SearchCourseNotes';
import MainLayout from '../../layouts/MainLayout';
import Tooltip from '@mui/material/Tooltip';

export const SearchDialog = ({ open, onClose, courseId, hasResults, setHasResults }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={hasResults ? 'lg' : 'md'}>
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', color: PRIMARY_COL }}>
        {courseId.toUpperCase()}
      </DialogTitle>
      <DialogContent sx={{ p: 1 }}>
        <SearchCourseNotes
          courseId={courseId || ''}
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
  return (
    <Box fragment-uri={uri} fragment-kind={fragmentKind}>
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

function getSectionUriToTitle(toc: FTML.TOCElem[], uriToTitle: Record<string, string>) {
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
  const [toc, setToc] = useState<FTML.TOCElem[] | undefined>(undefined);
  const uriToTitle = useRef<Record<string, string>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setDialogOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  const handleSearchClick = () => {
    setDialogOpen(true);
  };
  const handleDialogClose = () => {
    setDialogOpen(false);
  };

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
        uriToTitle.current = {};
        getSectionUriToTitle(toc, uriToTitle.current);
      });
  }, [router.isReady, courses, courseId]);

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

  if (!router.isReady || !courses || !gottos || !toc) {
    return <CircularProgress />;
  }
  const courseInfo = courses[courseId];
  if (!courseInfo) {
    router.replace('/');
    return <>Course Not Found!</>;
  }
  const { notes } = courseInfo;

  return (
    <MainLayout title={courseId.toUpperCase()}>
      <Tooltip title="Search (Shift+F or Ctrl+Shift+F)" placement="left-start">
        <IconButton
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 64,
            right: 24,
            zIndex: 2002,
            bgcolor: 'white',
            boxShadow: 3,
            '&:hover': { bgcolor: 'rgba(0,0,0,0.08)' },
          }}
          onClick={handleSearchClick}
          size="large"
          aria-label="Open search dialog"
        >
          <SearchIcon fontSize="large" />
        </IconButton>
      </Tooltip>
      <SearchDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        courseId={courseId}
        hasResults={hasResults}
        setHasResults={setHasResults}
      />
      <Box
        sx={{
          height: 'calc(100vh - 120px)',
          overflow: 'auto',
          position: 'relative',
        }}
      >
        <FTMLSetup>
          <FTMLDocument
            key={notes}
            document={{ type: 'FromBackend', uri: notes, toc: { Predefined: toc }, gottos }}
            onFragment={(uri, kind) => {
              if (kind.type === 'Section' || kind.type === 'Slide' || kind.type === 'Paragraph') {
                return (ch) => (
                  <FragmentWrap
                    uri={uri}
                    fragmentKind={kind.type}
                    children={ch}
                    uriToTitle={uriToTitle.current}
                  />
                );
              }
            }}
            onSectionTitle={(uri, lvl) => {
              return <TrafficLightIndicator sectionUri={uri} />;
            }}
          />
        </FTMLSetup>
      </Box>
    </MainLayout>
  );
};

export default CourseNotesPage;
