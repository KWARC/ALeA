import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Chip, CircularProgress, Tooltip, Typography } from '@mui/material';

import {
  AnswerResponse,
  FTMLProblemWithSolution,
  getProblemsForExam,
  formatExamLabelShortFromUri,
  formatExamLabelFullFromUri,
  getExamMetadataByUri,
  getGradingItems,
  getMyAnswers,
} from '@alea/spec';

import {
  AnswerContext,
  GradingContext,
  QuizDisplay,
  ShowGradingFor,
} from '@alea/stex-react-renderer';

import MainLayout from '../layouts/MainLayout';
import { contentFragment } from '@flexiformal/ftml-backend';
import { getProblemPointsFromDocument, parseContentFragmentTuple } from '@alea/quiz-utils';

type ExamAnswerContext = Record<
  string,
  {
    problemId: string;
    responses: { subProblemId: string; answer: string; graded?: boolean }[];
  }
>;
type ExamMetadata = Awaited<ReturnType<typeof getExamMetadataByUri>>;

async function buildFTMLProblem(problemUri: string): Promise<FTMLProblemWithSolution> {
  const [fragmentResponse, points] = await Promise.all([
    contentFragment({ uri: problemUri }),
    getProblemPointsFromDocument(problemUri),
  ]);
  const { titleHtml, html } = parseContentFragmentTuple(fragmentResponse);
  return {
    problem: {
      uri: problemUri,
      html,
      title_html: titleHtml,
      total_points: points,
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

async function buildAnswerContext(
  problemUris: string[],
  answers: AnswerResponse[],
  courseId?: string
): Promise<ExamAnswerContext> {
  const problemSet = new Set(problemUris);
  const latestByQuestionAndSubProblem = new Map<string, AnswerResponse>();

  for (const answer of answers) {
    if (!problemSet.has(answer.questionId)) continue;
    if (courseId && answer.courseId !== courseId) continue;

    const key = `${answer.questionId}::${answer.subProblemId}`;
    const existing = latestByQuestionAndSubProblem.get(key);
    if (
      !existing ||
      new Date(answer.updatedAt).getTime() > new Date(existing.updatedAt).getTime()
    ) {
      latestByQuestionAndSubProblem.set(key, answer);
    }
  }

  const responses: ExamAnswerContext = {};
  for (const answer of latestByQuestionAndSubProblem.values()) {
    const gradings = await getGradingItems(answer.id, answer.subProblemId);
    if (!responses[answer.questionId]) {
      responses[answer.questionId] = { problemId: answer.questionId, responses: [] };
    }
    responses[answer.questionId].responses.push({
      subProblemId: answer.subProblemId,
      answer: answer.answer,
      graded: gradings.length > 0,
    });
  }
  return responses;
}

const ExamProblemsPage = () => {
  const router = useRouter();
  const examUri = router.query.examUri as string | undefined;
  const targetProblemId = router.query.problemId as string | undefined;
  const courseId = router.query.courseId as string | undefined;

  const [examMeta, setExamMeta] = useState<ExamMetadata>(null);
  const [problems, setProblems] = useState<Record<string, FTMLProblemWithSolution>>({});
  const [answers, setAnswers] = useState<ExamAnswerContext>({});
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
        try {
          const myAnswers = await getMyAnswers();
          setAnswers(await buildAnswerContext(uris, myAnswers, courseId));
        } catch {
          setAnswers({});
        }
      } catch {
        return;
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, examUri, targetProblemId]);

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
      <MainLayout title="Exam" hideCourseHeader={true}>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`Review: ${examLabelFull}`}  hideCourseHeader={true}>
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
          <AnswerContext.Provider value={answers}>
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
