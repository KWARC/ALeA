import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Typography } from '@mui/material';
import { FTMLProblemWithSolution, getProblemsForExam } from '@alea/spec';
import {
  AnswerContext,
  GradingContext,
  QuizDisplay,
  ShowGradingFor,
} from '@alea/stex-react-renderer';
import MainLayout from '../layouts/MainLayout';
import { contentFragment } from '@flexiformal/ftml-backend';
import { getParamFromUri } from '@alea/utils';

export async function buildFTMLProblem(problemUri: string): Promise<FTMLProblemWithSolution> {
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
export async function buildExamProblems(
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

export function formatExamLabel(examUri?: string) {
  if (!examUri) return '';
  const dParam = getParamFromUri(examUri, 'd') || '';
  const pParam = getParamFromUri(examUri, 'p') || '';
  const termFromUri = pParam.split('/')[0];
  const cleanedD = dParam.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  if (termFromUri && cleanedD) {
    return `${termFromUri} ${cleanedD}`;
  }
  return cleanedD || termFromUri || '';
}
const ExamProblemsPage = () => {
  const router = useRouter();
  const examUri = router.query.examUri as string | undefined;
  const targetProblemId = router.query.problemId as string | undefined;
  const examLabel = useMemo(() => {
    return formatExamLabel(decodeURIComponent(examUri));
  }, [examUri]);
  const [problems, setProblems] = useState<Record<string, FTMLProblemWithSolution>>({});
  const [loading, setLoading] = useState(true);
  const [initialIndex, setInitialIndex] = useState<number>(0);

  useEffect(() => {
    if (!examUri || typeof examUri !== 'string') return;
    setLoading(true);

    getProblemsForExam(decodeURIComponent(examUri))
      .then(async (uris) => {
        if (targetProblemId) {
          const index = uris.indexOf(decodeURIComponent(targetProblemId));
          if (index !== -1) {
            setInitialIndex(index);
          }
        }

        const examProblems = await buildExamProblems(uris);
        setProblems(examProblems);
      })
      .finally(() => setLoading(false));
  }, [examUri, targetProblemId]);

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
    <MainLayout title="Exam Review">
      <Box sx={{ px: 2, pt: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
            zindex: 20,
            bgcolor: '#fff',
            px: 2,
            py: 2,
            borderBottom: '1px solid #ddd',
          }}
        >
          <Typography variant="h5" fontWeight="bold">
            {examLabel ? `Problems for ${examLabel}` : 'Exam Problems'}
          </Typography>
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
              isFrozen={true}
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
