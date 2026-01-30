import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress } from '@mui/material';
import { FTMLProblemWithSolution, getProblemsForExam } from '@alea/spec';
import {
  AnswerContext,
  GradingContext,
  QuizDisplay,
  ShowGradingFor,
} from '@alea/stex-react-renderer';
import MainLayout from '../layouts/MainLayout';
import { contentFragment } from '@flexiformal/ftml-backend';

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

const ExamProblemsPage = () => {
  const router = useRouter();
  const { examUri } = router.query;
  const [problems, setProblems] = useState<Record<string, FTMLProblemWithSolution>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examUri || typeof examUri !== 'string') return;
    setLoading(true);
    getProblemsForExam(decodeURIComponent(examUri))
      .then(async (uris) => {
        const examProblems = await buildExamProblems(uris);
        setProblems(examProblems);
      })
      .finally(() => setLoading(false));
  }, [examUri]);

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
          />
        </AnswerContext.Provider>
      </GradingContext.Provider>
    </MainLayout>
  );
};

export default ExamProblemsPage;
