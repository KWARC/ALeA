import { FTML } from '@kwarc/ftml-viewer';
import {
  Alert,
  Backdrop,
  Box,
  CircularProgress,
  Container,
  Paper,
  Snackbar,
  Typography,
} from '@mui/material';
import { getCourseInfo, getCoverageTimeline, updateCoverageTimeline } from '@stex-react/api';
import {
  convertHtmlStringToPlain,
  CourseInfo,
  CoverageTimeline,
  LectureEntry,
} from '@stex-react/utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { SecInfo } from '../types';
import { CoverageUpdater } from './CoverageUpdater';
import { getFlamsServer } from '@kwarc/ftml-react';

export function getSecInfo(data: FTML.TOCElem, level = 0): SecInfo[] {
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
  const [secInfo, setSecInfo] = useState<Record<FTML.DocumentURI, SecInfo>>({});
  const [snaps, setSnaps] = useState<LectureEntry[]>([]);
  const [coverageTimeline, setCoverageTimeline] = useState<CoverageTimeline>({});
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo }>({});
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    getCoverageTimeline(true).then(setCoverageTimeline);
  }, []);

  useEffect(() => {
    getCourseInfo().then(setCourses);
  }, []);

  useEffect(() => {
    const getSections = async () => {
      const courseInfo = courses?.[courseId];
      if (!courseInfo) return;
      const { notes: notesUri } = courseInfo;
      setLoading(true);
      try {
        const docSections = (await getFlamsServer().contentToc({ uri: notesUri }))?.[1] ?? [];
        const sections = docSections.flatMap((d) => getSecInfo(d));
        const baseSecInfo = sections.reduce((acc, s) => {
          acc[s.uri] = s;
          return acc;
        }, {} as Record<FTML.DocumentURI, SecInfo>);
        try {
          const res = await fetch(`/api/get-durations?courseId=${courseId}`);
          const durationData = await res.json();
          console.log("DurationData---",durationData);
          for (const uri in baseSecInfo) {
            if (durationData.sectionDurations?.[uri]) {
              baseSecInfo[uri].duration = durationData.sectionDurations[uri];
            }
          }
        } catch (durationError) {
          console.warn('Could not fetch durations:', durationError);
        }
        console.log("BaseSectionInfo---",baseSecInfo);
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
          <Typography variant="h4" component="h1" gutterBottom color="primary">
            Syllabus for {courseId}
          </Typography>

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
