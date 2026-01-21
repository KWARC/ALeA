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
  for (const uri of problemUris) {
    result[uri] = await buildFTMLProblem(uri);
  }
  return result;
}

export function formatExamLabel(examUri: string, term?: string) {
  const decodedUri = decodeURIComponent(examUri);
  const dParam = getParamFromUri(decodedUri, 'd') || '';
  const pParam = getParamFromUri(decodedUri, 'p') || '';

  const courseMatch = decodedUri.match(/courses\/[^/]+\/([^/]+)/);
  const courseAcronym = courseMatch ? courseMatch[1].toUpperCase() : 'AI-1';
  const rawTerm = term || pParam.split('/')[0] || '';
  const formattedTerm = rawTerm.replace(/([A-Z]+)(\d{2})(\d{2})/, '$1 $2/$3');
  const cleanedD = dParam.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return `${courseAcronym} ${cleanedD} ${formattedTerm}`.trim();
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
    <MainLayout title={`Review: ${examLabel}`}>
      <Box sx={{ px: 2, pt: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f9f9f9',
            px: 2,
            py: 1,
            mb: 1,
            borderRadius: '8px',
            borderBottom: '2px solid #1976d2',
          }}
        >
          <Typography variant="h4" fontWeight="bold" color="primary" textAlign="center">
            {examLabel}
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
