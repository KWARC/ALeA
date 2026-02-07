import { FTML } from '@flexiformal/ftml';
import {
  Alert,
  Backdrop,
  Box,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { getAllCourses, getCoverageTimeline, updateCoverageTimeline } from '@alea/spec';
import { convertHtmlStringToPlain, CourseInfo, CoverageTimeline, LectureEntry } from '@alea/utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { SecInfo } from '../types';
import { CoverageUpdater } from './CoverageUpdater';
import { contentToc } from '@flexiformal/ftml-backend';
import { ContentDashboard } from '@alea/stex-react-renderer';
import { MenuBook } from '@mui/icons-material';

export function getSecInfo(data: FTML.TocElem, level = 0): SecInfo[] {
  const secInfo: SecInfo[] = [];

  if (data.type === 'Section' && data.title) {
    secInfo.push({
      id: data.id,
      title: '\xa0'.repeat(level * 4) + convertHtmlStringToPlain(data.title),
      uri: data.uri,
    });
  }
  if (data.type === 'SkippedSection' || data.type === 'Section') level++;
  if ('children' in data) {
    for (const child of data.children) {
      secInfo.push(...getSecInfo(child, level));
    }
  }
  return secInfo;
}

const CoverageUpdateTab = () => {
  const router = useRouter();
  const courseId = router.query.courseId as string;
  const [secInfo, setSecInfo] = useState<Record<FTML.DocumentUri, SecInfo>>({});
  const [snaps, setSnaps] = useState<LectureEntry[]>([]);
  const [coverageTimeline, setCoverageTimeline] = useState<CoverageTimeline>({});
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo }>({});
  const [loading, setLoading] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [toc, setToc] = useState<FTML.TocElem[]>([]);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    getCoverageTimeline(true).then(setCoverageTimeline);
  }, []);

  useEffect(() => {
    getAllCourses().then(setCourses);
  }, []);

  useEffect(() => {
    const getSections = async () => {
      const courseInfo = courses?.[courseId];
      if (!courseInfo) return;
      const { notes: notesUri } = courseInfo;
      setLoading(true);
      try {
        const docSections = (await contentToc({ uri: notesUri }))?.[1] ?? [];
        setToc(docSections);
        const sections = docSections.flatMap((d) => getSecInfo(d));
        const baseSecInfo = sections.reduce((acc, s) => {
          acc[s.uri] = s;
          return acc;
        }, {} as Record<FTML.DocumentUri, SecInfo>);
        try {
          const res = await fetch(`/api/get-teaching-duration-per-section?courseId=${courseId}`);
          const durationData = await res.json();
          for (const semKey in durationData) {
            const semDurations = durationData[semKey];
            if (!semDurations || !semDurations.sectionDurations) continue;

            for (const uri in semDurations.sectionDurations) {
              const duration = semDurations.sectionDurations[uri];
              if (!baseSecInfo[uri]) continue;

              if (!baseSecInfo[uri].durations) {
                baseSecInfo[uri].durations = {};
              }

              baseSecInfo[uri].durations[semKey] = duration;
            }
          }

          const semesterKeys = Object.keys(durationData).sort();
          const latestSemester = semesterKeys[semesterKeys.length - 1];
          const normalizedLatest = latestSemester.trim().toLowerCase();

          for (const uri in baseSecInfo) {
            const durations = baseSecInfo[uri].durations;
            if (!durations) continue;

            const previousSemesters = Object.entries(durations).filter(
              ([key]) => key.trim().toLowerCase() !== normalizedLatest
            );

            const average =
              previousSemesters.length > 0
                ? previousSemesters.reduce((sum, [_, val]) => sum + val, 0) /
                  previousSemesters.length
                : null;

            const latestDuration = durations[latestSemester] ?? null;

            baseSecInfo[uri].averagePastDuration = average;
            baseSecInfo[uri].latestDuration = latestDuration;

            const sectionTitle = baseSecInfo[uri].title || uri;
          }
        } catch (durationError) {
          console.warn('Could not fetch durations:', durationError);
        }
        setSecInfo(baseSecInfo);
      } catch (error) {
        console.error('Failed to fetch all sections:', error);
        setSaveMessage({
          type: 'error',
          message: 'Failed to fetch sections. Please try again.',
        });
      } finally {
        setLoading(false);
      }
    };

    getSections();
  }, [courses, courseId]);

  useEffect(() => {
    if (!router.isReady || !courseId?.length) return;
    const courseSnaps = coverageTimeline[courseId] || [];
    setSnaps(courseSnaps);
  }, [coverageTimeline, courseId, router.isReady]);

  const handleSaveSingle = async (updatedEntry: LectureEntry) => {
    setLoading(true);
    try {
      await updateCoverageTimeline({ courseId, updatedEntry });
      setSnaps((prevSnaps) => {
        const index = prevSnaps.findIndex((s) => s.timestamp_ms === updatedEntry.timestamp_ms);

        if (index !== -1) {
          const updated = [...prevSnaps];
          updated[index] = updatedEntry;
          return updated;
        }
        return [...prevSnaps, updatedEntry].sort((a, b) => a.timestamp_ms - b.timestamp_ms);
      });

      setSaveMessage({
        type: 'success',
        message: 'Coverage data saved successfully!',
      });
    } catch (error) {
      console.error('Error saving coverage:', error);
      setSaveMessage({
        type: 'error',
        message: 'Failed to save coverage data. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSingle = async (timestamp_ms: number) => {
    setLoading(true);
    try {
      await updateCoverageTimeline({ courseId, timestamp_ms, action: 'delete' });
      setSnaps((prev) => prev.filter((e) => e.timestamp_ms !== timestamp_ms));
      setSaveMessage({ type: 'success', message: 'Coverage deleted successfully!' });
    } catch (err) {
      console.error(err);
      setSaveMessage({ type: 'error', message: 'Failed to delete coverage' });
    } finally {
      setLoading(false);
    }
  };

  if (!router.isReady || !courseId || typeof courseId !== 'string') {
    return <div>Loading...</div>;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Container maxWidth="xl">
        <Paper
          elevation={3}
          sx={{
            p: { xs: 2, sm: 3 },
            my: 3,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Typography variant="h4" component="h1" color="primary">
              Syllabus for {courseId}
            </Typography>

            <Box
              onMouseEnter={() => setShowDashboard(true)}
              onMouseLeave={() => setShowDashboard(false)}
              sx={{ position: 'relative' }}
            >
              <Tooltip title="View Course Content" arrow>
                <IconButton
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  <MenuBook />
                </IconButton>
              </Tooltip>

              {showDashboard && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    zIndex: 1300,
                    mt: 1,
                    width: 320,
                    maxHeight: 400,
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 3,
                    border: 1,
                    borderColor: 'divider',
                    overflow: 'auto',
                  }}
                >
                  <ContentDashboard
                    key={courseId}
                    courseId={courseId}
                    toc={toc}
                    selectedSection=""
                    onClose={() => setShowDashboard(false)}
                    onSectionClick={(sectionId: string) => {
                      setShowDashboard(false);
                    }}
                  />
                </Box>
              )}
            </Box>
          </Box>
          <Snackbar
            open={!!saveMessage}
            autoHideDuration={8000}
            onClose={() => setSaveMessage(null)}
          >
            <Alert severity={saveMessage?.type}>{saveMessage?.message}</Alert>
          </Snackbar>

          <Box sx={{ mt: 2, overflow: 'auto' }}>
            <CoverageUpdater
              courseId={courseId}
              snaps={snaps}
              secInfo={secInfo}
              handleSaveSingle={handleSaveSingle}
              handleDeleteSingle={handleDeleteSingle}
            />
          </Box>
        </Paper>
      </Container>

      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loading}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
};

export default CoverageUpdateTab;
