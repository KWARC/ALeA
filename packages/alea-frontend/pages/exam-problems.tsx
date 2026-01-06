import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Box, Button, CircularProgress, Typography, Divider, Alert } from '@mui/material';
import { getProblemsForExam } from '@alea/spec';
import { SafeFTMLFragment } from '@alea/stex-react-renderer';
import MainLayout from '../layouts/MainLayout';

const SIDEBAR_WIDTH = 260;

const ExamProblemsPage = () => {
  const router = useRouter();
  const { examUri } = router.query;

  const decodedExamUri = useMemo(
    () => (typeof examUri === 'string' ? decodeURIComponent(examUri) : undefined),
    [examUri]
  );

  const [problems, setProblems] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentProblemUri = problems[activeIndex];
  const hasProblems = problems.length > 0;

  useEffect(() => {
    if (!decodedExamUri) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchProblems = async () => {
      try {
        const res = await getProblemsForExam(decodedExamUri);
        if (isMounted) {
          setProblems(res ?? []);
          setActiveIndex(0);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load the problem list from the backend.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProblems();

    return () => {
      isMounted = false;
    };
  }, [decodedExamUri]);

  if (loading) {
    return (
      <MainLayout title="Exam Review">
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}
        >
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (!hasProblems) {
    return (
      <MainLayout title="Exam Review">
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              No problems found for this exam.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              {error ||
                'Please check back later or contact support if you believe this is an error.'}
            </Typography>
          </Box>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Exam Review">
      <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
        <Box
          sx={{
            width: SIDEBAR_WIDTH,
            borderRight: 1,
            borderColor: 'divider',
            overflowY: 'auto',
            bgcolor: 'grey.50',
          }}
        >
          {problems.map((_, idx) => (
            <Box
              key={idx}
              onClick={() => setActiveIndex(idx)}
              sx={{
                p: 2,
                cursor: 'pointer',
                borderBottom: 1,
                borderColor: 'grey.100',
                bgcolor: activeIndex === idx ? 'action.selected' : 'transparent',
                borderLeft: activeIndex === idx ? 4 : 0,
                borderLeftColor: 'primary.main',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: activeIndex === idx ? 700 : 400 }}>
                Problem {idx + 1}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ flex: 1, p: 4, overflowY: 'auto', bgcolor: 'background.paper' }}>
          <Box sx={{ maxWidth: '850px', margin: 'auto' }}>
            <Typography variant="h5" color="primary" gutterBottom>
              Question {activeIndex + 1} of {problems.length}
            </Typography>
            <Divider sx={{ mb: 4 }} />

            <Box
              sx={{ minHeight: '50vh', p: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}
            >
              {error ? (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                </Box>
              ) : currentProblemUri ? (
                <Box fragment-uri={currentProblemUri} fragment-kind="Problem">
                  <SafeFTMLFragment
                    key={currentProblemUri}
                    fragment={{ type: 'FromBackend', uri: currentProblemUri }}
                    allowHovers={true}
                    problemStates={new Map()}
                  />
                </Box>
              ) : (
                <Box
                  sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10 }}
                >
                  <CircularProgress size={30} />
                  <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                    Loading problem...
                  </Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 5, pb: 10 }}>
              <Button
                variant="outlined"
                disabled={activeIndex === 0}
                onClick={() => setActiveIndex((i) => i - 1)}
              >
                Previous
              </Button>
              <Button
                variant="contained"
                disabled={activeIndex === problems.length - 1}
                onClick={() => setActiveIndex((i) => i + 1)}
              >
                Next Problem
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </MainLayout>
  );
};

export default ExamProblemsPage;
