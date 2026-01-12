/* eslint-disable react/display-name, react/no-children-prop */
import { SafeFTMLDocument } from '@alea/stex-react-renderer';
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
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import { getAllCourses, getLatestInstance, validateInstitution, validateInstance } from '@alea/spec';
import { CommentButton } from '@alea/comments';
import { SectionReview, TrafficLightIndicator } from '@alea/stex-react-renderer';
import { CourseInfo, LectureEntry, PRIMARY_COL } from '@alea/utils';
import axios from 'axios';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { ReactNode, useEffect, useRef, useState } from 'react';
import SearchCourseNotes from '../../../../components/SearchCourseNotes';
import MainLayout from '../../../../layouts/MainLayout';
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
  
  const rawInstitutionId = router.query.institutionId as string;
  const courseId = router.query.courseId as string;
  const instanceIdOrLatest = router.query.instanceIdOrLatest as string;
  
  // Normalize institutionId to uppercase
  const institutionId = rawInstitutionId?.toUpperCase() || '';
  
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo } | undefined>(undefined);
  const [gottos, setGottos] = useState<{ uri: string; timestamp: number }[] | undefined>(undefined);
  const [toc, setToc] = useState<FTML.TocElem[] | undefined>(undefined);
  const uriToTitle = useRef<Record<string, string>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  
  const [resolvedInstanceId, setResolvedInstanceId] = useState<string | null>(null);
  const [loadingInstanceId, setLoadingInstanceId] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    if (!router.isReady || !rawInstitutionId || !courseId || !instanceIdOrLatest) return;
    
    const expectedQueryKeys = ['institutionId', 'courseId', 'instanceIdOrLatest'];
    const hasUnwantedQuery = Object.keys(router.query).some(key => 
      !expectedQueryKeys.includes(key) || (key === 'courseId' && router.query.courseId !== courseId)
    );
    
    if (rawInstitutionId !== institutionId || hasUnwantedQuery) {
      const normalizedPath = `/${institutionId}/${courseId}/${instanceIdOrLatest}/course-notes`;
      router.replace(normalizedPath);
      return;
    }
  }, [router.isReady, rawInstitutionId, institutionId, courseId, instanceIdOrLatest, router, router.query]);

  // Validate and resolve instanceId
  useEffect(() => {
    if (!router.isReady || !institutionId || !courseId || !instanceIdOrLatest) return;
    
    setIsValidating(true);
    setValidationError(null);
    
    validateInstitution(institutionId)
      .then((isValid) => {
        if (!isValid) {
          setValidationError('Invalid institutionId');
          setIsValidating(false);
          setTimeout(() => router.push('/'), 3000);
          return;
        }
        
        getAllCourses().then((allCourses) => {
          setCourses(allCourses);
          if (!allCourses[courseId]) {
            setValidationError('Invalid courseId');
            setIsValidating(false);
            setTimeout(() => router.push('/'), 3000);
            return;
          }
          
          if (instanceIdOrLatest === 'latest') {
            setLoadingInstanceId(true);
            getLatestInstance(institutionId)
              .then((latestInstanceId) => {
                setResolvedInstanceId(latestInstanceId);
                setLoadingInstanceId(false);
                setIsValidating(false);
              })
              .catch((error) => {
                console.error('Failed to fetch latest instanceId:', error);
                setValidationError('Failed to fetch latest instanceId');
                setLoadingInstanceId(false);
                setIsValidating(false);
              });
          } else {
            validateInstance(institutionId, instanceIdOrLatest)
              .then((isValidInstance) => {
                if (!isValidInstance) {
                  setValidationError('Invalid instanceId');
                  setIsValidating(false);
                  setTimeout(() => router.push('/'), 3000);
                } else {
                  setResolvedInstanceId(instanceIdOrLatest);
                  setLoadingInstanceId(false);
                  setIsValidating(false);
                }
              })
              .catch((error) => {
                console.error('Error validating instanceId:', error);
                setValidationError('Invalid instanceId');
                setIsValidating(false);
                setTimeout(() => router.push('/'), 3000);
              });
          }
        });
      })
      .catch((error) => {
        console.error('Error validating institutionId:', error);
        setValidationError('Error validating institutionId');
        setIsValidating(false);
      });
  }, [router.isReady, institutionId, courseId, instanceIdOrLatest, router]);

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
    const notes = courses?.[courseId]?.notes;
    if (!notes) return;
    setToc(undefined);
    contentToc({ uri: notes }).then(([css, toc] = [[], []]) => {
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

  if (validationError && !isValidating && !loadingInstanceId) {
    return (
      <MainLayout title="Error | ALeA">
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (!router.isReady || !courses || isValidating || loadingInstanceId || !resolvedInstanceId || !gottos || !toc) {
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
      {/* <Tooltip title="Search (Ctrl+Shift+F)" placement="left-start">
        <IconButton
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 64,
            right: 24,
            zIndex: 1000,
            bgcolor: 'rgba(255, 255, 255, 0.15)',
            boxShadow: 3,
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.3)',
            },
          }}
          onClick={handleSearchClick}
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
        hasResults={hasResults}
        setHasResults={setHasResults}
      /> */}
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
          onSectionTitle={(uri, lvl) => {
            return <TrafficLightIndicator sectionUri={uri} />;
          }}
        />
      </Box>
    </MainLayout>
  );
};

export default CourseNotesPage;
