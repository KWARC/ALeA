import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Chip, CircularProgress, Tooltip, Typography } from '@mui/material';

import {
  FTMLProblemWithSolution,
  getProblemsForExam,
  formatExamLabelShortFromUri,
  formatExamLabelFullFromUri,
  getExamMetadataByUri,
} from '@alea/spec';

import {
  AnswerContext,
  GradingContext,
  QuizDisplay,
  ShowGradingFor,
} from '@alea/stex-react-renderer';

import MainLayout from '../layouts/MainLayout';
import { contentFragment } from '@flexiformal/ftml-backend';

async function buildFTMLProblem(problemUri: string): Promise<FTMLProblemWithSolution> {
  const fragmentResponse: any[] = await contentFragment({ uri: problemUri });
  return {
    problem: {
      uri: problemUri,
      html: fragmentResponse[2],
      title_html: '',
    },
    answerClasses: [],
  };
}

async function buildExamProblems(
  problemUris: string[]
): Promise<Record<string, FTMLProblemWithSolution>> {
  const result: Record<string, FTMLProblemWithSolution> = {};
  await Promise.all(
    problemUris.map(async (uri) => {
      result[uri] = await buildFTMLProblem(uri);
    })
  );
  return result;
}

const ExamProblemsPage = () => {
  const router = useRouter();
  const examUri = router.query.examUri as string | undefined;
  const targetProblemId = router.query.problemId as string | undefined;

  const [examMeta, setExamMeta] = useState<any>(null);
  const [problems, setProblems] = useState<Record<string, FTMLProblemWithSolution>>({});
  const [loading, setLoading] = useState(true);
  const [initialIndex, setInitialIndex] = useState<number>(0);

  useEffect(() => {
    if (!examUri) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const decodedUri = decodeURIComponent(examUri);

        const meta = await getExamMetadataByUri(decodedUri);
        setExamMeta(meta);

        const uris = await getProblemsForExam(decodedUri);

        if (targetProblemId) {
          const idx = uris.indexOf(decodeURIComponent(targetProblemId));
          if (idx !== -1) setInitialIndex(idx);
        }

        const examProblems = await buildExamProblems(uris);
        setProblems(examProblems);
      } catch (error) {
        console.error('Error loading exam data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [examUri, targetProblemId]);

  const examLabelShort = useMemo(() => {
    if (!examUri || !examMeta) return '';
    return formatExamLabelShortFromUri(examUri, examMeta);
  }, [examUri, examMeta]);

  const examLabelFull = useMemo(() => {
    if (!examUri || !examMeta) return '';
    return formatExamLabelFullFromUri(examUri, examMeta);
  }, [examUri, examMeta]);

  if (loading) {
    return (
      <MainLayout title="Exam">
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`Review: ${examLabelFull}`}>
      <Box sx={{ px: 2, pt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          {examLabelShort && (
            <Tooltip
              title={
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {examLabelFull}
                  </Typography>
                  <Typography variant="caption" color="inherit">
                    This problem belongs to this exam
                  </Typography>
                </Box>
              }
              placement="left"
              arrow
            >
              <Chip
                label={examLabelShort}
                color="primary"
                sx={{
                  fontWeight: 600,
                  px: 1.5,
                  borderRadius: '8px',
                  boxShadow: '0px 3px 10px rgba(25,118,210,0.3)',
                  background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                }}
              />
            </Tooltip>
          )}
        </Box>

        <GradingContext.Provider
          value={{
            showGradingFor: ShowGradingFor.INSTRUCTOR,
            isGrading: false,
            showGrading: false,
            gradingInfo: undefined,
            studentId: undefined,
          }}
        >
          <AnswerContext.Provider value={{}}>
            <QuizDisplay
              problems={problems}
              existingResponses={{}}
              isFrozen={false}
              showPerProblemTime={false}
              isExamProblem={true}
              initialProblemIdx={initialIndex}
            />
          </AnswerContext.Provider>
        </GradingContext.Provider>
      </Box>
    </MainLayout>
  );
};

export default ExamProblemsPage;
