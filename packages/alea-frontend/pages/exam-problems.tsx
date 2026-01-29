import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Chip, CircularProgress, Tooltip, Typography } from '@mui/material';
import {
  formatExamLabelFull,
  FTMLProblemWithSolution,
  getExamMeta,
  getExamsForCourse,
  getProblemsForExam,
} from '@alea/spec';
import {
  AnswerContext,
  GradingContext,
  QuizDisplay,
  ShowGradingFor,
} from '@alea/stex-react-renderer';
import MainLayout from '../layouts/MainLayout';
import { contentFragment } from '@flexiformal/ftml-backend';
import { getParamFromUri } from '@alea/utils';

function getCourseIdFromExamUri(examUri?: string) {
  if (!examUri) return null;
  const decoded = decodeURIComponent(examUri);

  const match = decoded.match(/courses\/[^/]+\/([^/]+)/);
  if (match && match[1]) {
    const cid = match[1].toLowerCase();
    // Agar URL mein sirf 'ai' hai, toh use 'ai-1' treat karein for backward compatibility
    return cid === 'ai' ? 'ai-1' : cid;
  }
  return null;
}
export function getExamMetaFromUri(examUri?: string) {
  if (!examUri) return null;

  const decodedUri = decodeURIComponent(examUri);
  const dParam = getParamFromUri(decodedUri, 'd') || '';
  const pParam = getParamFromUri(decodedUri, 'p') || '';

  const courseMatch = decodedUri.match(/courses\/[^/]+\/([^/]+)/);
  const courseAcronym = courseMatch ? courseMatch[1].toUpperCase() : '';
  const rawTerm = pParam.split('/')[0] || '';
  const formattedTerm = rawTerm.replace(/([A-Z]+)(\d{2})(\d{2})/, '$1 $2/$3');
  const cleanedD = dParam.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const dateMatch = decodedUri.match(/(\d{4}-\d{2}-\d{2})/);
  const formattedDate = dateMatch ? new Date(dateMatch[1]).toLocaleDateString('en-GB') : '';

  return {
    courseAcronym,
    cleanedD,
    formattedTerm,
    formattedDate,
  };
}

export function getExamMetaFromFlams(
  examUri?: string,
  exam?: { term?: string; number?: string; date?: string }
) {
  if (!examUri) return null;

  const decodedUri = decodeURIComponent(examUri);
  let courseAcronym = exam?.number;

  if (!courseAcronym) {
    const match = decodedUri.match(/courses\/[^/]+\/([^/]+)/);
    courseAcronym = match ? match[1].toUpperCase() : 'AI-1';
  }

  const dParam = getParamFromUri(decodedUri, 'd') || '';
  const cleanedD = dParam.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const pParam = getParamFromUri(decodedUri, 'p') || '';
  const rawTerm = exam?.term || pParam.split('/')[0] || '';
  const formattedTerm = rawTerm.replace(/([A-Z]+)(\d{2})(\d{2})/, '$1 $2/$3');

  let formattedDate = '';
  if (exam?.date) {
    formattedDate = new Date(exam.date).toLocaleDateString('en-GB');
  } else {
    const dateMatch = decodedUri.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      formattedDate = new Date(dateMatch[1]).toLocaleDateString('en-GB');
    }
  }

  return {
    courseAcronym,
    cleanedD,
    formattedTerm,
    formattedDate,
  };
}

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

export function formatExamLabelShort(examUri?: string, exam?: any, courseId?: string) {
  const meta = getExamMeta(examUri, exam, courseId);
  if (!meta) return '';

  const { courseAcronym, cleanedD, formattedTerm } = meta;
  return [courseAcronym, cleanedD, formattedTerm].filter(Boolean).join(' ');
}

const ExamProblemsPage = () => {
  const router = useRouter();
  const examUri = router.query.examUri as string | undefined;
  const targetProblemId = router.query.problemId as string | undefined;
  const [examMeta, setExamMeta] = useState<any>(null);

  const courseId = useMemo(() => getCourseIdFromExamUri(examUri), [examUri]);

  useEffect(() => {
    if (!examUri || !courseId) return;

    getExamsForCourse(courseId).then((exams) => {
      const found = exams.find((e) => e.uri === examUri);
      setExamMeta(found);
    });
  }, [examUri, courseId]);

  const examLabelShort = useMemo(() => {
    return formatExamLabelShort(examUri, examMeta, courseId);
  }, [examUri, examMeta, courseId]);

  const examLabelFull = useMemo(() => {
    return formatExamLabelFull(examUri, examMeta, courseId);
  }, [examUri, examMeta, courseId]);

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
    <MainLayout title={`Review: ${examLabelFull}`}>
      <Box sx={{ px: 2, pt: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            mb: 1,
          }}
        >
          {examLabelShort && (
            <Tooltip
              title={
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {examLabelFull}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
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
                variant="filled"
                sx={{
                  fontWeight: 600,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: '8px',
                  boxShadow: '0px 3px 10px rgba(25, 118, 210, 0.35)',
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
