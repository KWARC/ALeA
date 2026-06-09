import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Chip, CircularProgress, Tooltip, Typography } from '@mui/material';

import {
  FTMLProblemWithSolution,
  getProblemsForQuiz,
  formatQuizLabelShortFromUri,
  formatQuizLabelFullFromUri,
  getQuizMetadataByUri,
} from '@alea/spec';

import {
  AnswerContext,
  GradingContext,
  QuizDisplay,
  ShowGradingFor,
} from '@alea/stex-react-renderer';

import MainLayout from '../layouts/MainLayout';
import { contentFragment, solution as flamsSolution } from '@flexiformal/ftml-backend';

async function buildFTMLProblem(problemUri: string): Promise<FTMLProblemWithSolution> {
  const [fragmentResponse, sol]: [any[], string | undefined] = await Promise.all([
    contentFragment({ uri: problemUri }),
    flamsSolution({ uri: problemUri }),
  ]);

  return {
    problem: {
      uri: problemUri,
      html: fragmentResponse[2],
      title_html: '',
    },
    solution: sol,
    answerClasses: [],
  };
}

async function buildQuizProblems(
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

const QuizProblemsPage = () => {
  const router = useRouter();
  const quizUri = router.query.quizUri as string | undefined;
  const courseId = router.query.courseId as string | undefined;
  const targetProblemId = router.query.problemId as string | undefined;

  const [quizMeta, setQuizMeta] = useState<any>(null);
  const [problems, setProblems] = useState<Record<string, FTMLProblemWithSolution>>({});
  const [loading, setLoading] = useState(true);
  const [initialIndex, setInitialIndex] = useState<number>(0);
  const [frozenProblems, setFrozenProblems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!quizUri) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const decodedUri = decodeURIComponent(quizUri);

        const meta = await getQuizMetadataByUri(decodedUri);
        setQuizMeta(meta);

        const uris = await getProblemsForQuiz(decodedUri);

        if (targetProblemId) {
          const idx = uris.indexOf(decodeURIComponent(targetProblemId));
          if (idx !== -1) setInitialIndex(idx);
        }

        const quizProblems = await buildQuizProblems(uris);
        setProblems(quizProblems);
      } catch (error) {
        console.error('Error loading quiz data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [quizUri, targetProblemId]);

  const quizLabelShort = useMemo(() => {
    if (!quizUri || !quizMeta) return '';
    return formatQuizLabelShortFromUri(quizUri, quizMeta, courseId ?? quizMeta?.courseId);
  }, [quizUri, quizMeta, courseId]);

  const quizLabelFull = useMemo(() => {
    if (!quizUri || !quizMeta) return '';
    return formatQuizLabelFullFromUri(quizUri, quizMeta, courseId ?? quizMeta?.courseId);
  }, [quizUri, quizMeta, courseId]);

  if (loading) {
    return (
      <MainLayout title="Quiz" hideCourseHeader>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`Review: ${quizLabelFull}`} hideCourseHeader>
      <Box sx={{ px: 2, pt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          {quizLabelShort && (
            <Tooltip
              title={
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {quizLabelFull}
                  </Typography>
                  <Typography variant="caption" color="inherit">
                    This problem belongs to this quiz
                  </Typography>
                </Box>
              }
              placement="left"
              arrow
            >
              <Chip
                label={quizLabelShort}
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
            showGrading: true,
            gradingInfo: {},
            studentId: '',
          }}
        >
          <AnswerContext.Provider value={{}}>
            <QuizDisplay
              problems={problems}
              existingResponses={{}}
              isFrozen={false}
              frozenProblems={frozenProblems}
              onProblemFreeze={(problemId) => {
                setFrozenProblems((prev) => ({ ...prev, [problemId]: true }));
              }}
              showPerProblemTime={false}
              isExamProblem={false}
              initialProblemIdx={initialIndex}
            />
          </AnswerContext.Provider>
        </GradingContext.Provider>
      </Box>
    </MainLayout>
  );
};

export default QuizProblemsPage;
