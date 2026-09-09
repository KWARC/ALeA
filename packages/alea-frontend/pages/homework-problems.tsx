import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Chip, CircularProgress, Tooltip, Typography } from '@mui/material';

import { FTMLProblemWithSolution, getProblemsForHomework } from '@alea/spec';

import {
  AnswerContext,
  GradingContext,
  QuizDisplay,
  ShowGradingFor,
} from '@alea/stex-react-renderer';

import MainLayout from '../layouts/MainLayout';
import { contentFragment, solution as flamsSolution } from '@flexiformal/ftml-backend';

async function buildFTMLProblem(problemUri: string): Promise<FTMLProblemWithSolution> {
  const [fragmentResponse, sol]: [unknown[], string | undefined] = await Promise.all([
    contentFragment({ uri: problemUri }),
    flamsSolution({ uri: problemUri }),
  ]);

  return {
    problem: {
      uri: problemUri,
      html: fragmentResponse[2] as string,
      title_html: '',
    },
    solution: sol,
    answerClasses: [],
  };
}

async function buildHomeworkProblems(
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

function getHomeworkLabel(homeworkUri?: string, courseId?: string) {
  if (!homeworkUri) return '';

  const term = homeworkUri.match(/\/([A-Z]+[0-9]{2}(?:-[0-9]{2})?)\//)?.[1] ?? '';
  const formattedTerm = term.replace(/([A-Z]+)(\d{2})(?:-(\d{2}))?/, (_match, prefix, start, end) =>
    end ? `${prefix} ${start}/${end}` : `${prefix} ${start}`
  );
  const assignment = homeworkUri.match(/assignments\/([^/?&#]+)/)?.[1] ?? '';
  const formattedAssignment = assignment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return [courseId?.toUpperCase(), formattedAssignment || 'Homework', formattedTerm]
    .filter(Boolean)
    .join(' ');
}

const HomeworkProblemsPage = () => {
  const router = useRouter();
  const homeworkUri = router.query.homeworkUri as string | undefined;
  const courseId = router.query.courseId as string | undefined;
  const targetProblemId = router.query.problemId as string | undefined;

  const [problems, setProblems] = useState<Record<string, FTMLProblemWithSolution>>({});
  const [loading, setLoading] = useState(true);
  const [initialIndex, setInitialIndex] = useState<number>(0);
  const [frozenProblems, setFrozenProblems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!homeworkUri) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const decodedUri = decodeURIComponent(homeworkUri);
        const uris = await getProblemsForHomework(decodedUri);

        if (targetProblemId) {
          const idx = uris.indexOf(decodeURIComponent(targetProblemId));
          if (idx !== -1) setInitialIndex(idx);
        }

        const homeworkProblems = await buildHomeworkProblems(uris);
        setProblems(homeworkProblems);
      } catch (error) {
        console.error('Error loading homework data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [homeworkUri, targetProblemId]);

  const homeworkLabel = useMemo(
    () => getHomeworkLabel(homeworkUri, courseId),
    [courseId, homeworkUri]
  );

  if (loading) {
    return (
      <MainLayout title="Homework" hideCourseHeader>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`Review: ${homeworkLabel}`} hideCourseHeader>
      <Box sx={{ px: 2, pt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          {homeworkLabel && (
            <Tooltip
              title={
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {homeworkLabel}
                  </Typography>
                  <Typography variant="caption" color="inherit">
                    This problem belongs to this homework
                  </Typography>
                </Box>
              }
              placement="left"
              arrow
            >
              <Chip
                label={homeworkLabel}
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

export default HomeworkProblemsPage;
