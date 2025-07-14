import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Tooltip,
  Card,
  Button,
  CircularProgress,
  IconButton,
  Paper,
} from '@mui/material';
import { Feedback, Folder, OpenInNew } from '@mui/icons-material';
import { getFeedback, ProblemJson, QuizProblem } from '@stex-react/api';
import { QuizProblemViewer } from '../components/GenerateQuiz';
import { PRIMARY_COL } from '@stex-react/utils';
import { handleViewSource, ListStepper, UriProblemViewer } from '@stex-react/stex-react-renderer';
import { FeedbackSection } from '../components/quiz-gen/Feedback';
import { CourseSectionSelector } from '../components/quiz-gen/CourseSectionSelector';
import { QuestionSidebar } from '../components/quiz-gen/QuizSidebar';
import { SecInfo } from '../types';
import { useRouter } from 'next/router';
function HiddenFeedback({ problemId }: { problemId: number }) {
  const [feedback, setFeedback] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'F') {
        setShow((s) => !s);
        try {
          const data = await getFeedback(problemId);
          setFeedback(data);
        } catch (err) {
          console.error('Could not fetch feedback', err);
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [problemId]);

  if (!show || !feedback) return null;

  return (
    <Paper elevation={3} sx={{ mt: 3, p: 2, borderLeft: '6px solid #007BFF' }}>
      <Box display="flex" alignItems="center" mb={1}>
        <Feedback color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6">Feedback (Admin)</Typography>
      </Box>
      <Typography>
        <strong>Rating:</strong> {feedback.rating}
      </Typography>
      <Typography>
        <strong>Reasons:</strong> {feedback.reasons}
      </Typography>
      <Typography>
        <strong>Comments:</strong> {feedback.comments}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {new Date(feedback.createdAt).toLocaleString()}
      </Typography>
    </Paper>
  );
}
export type FlatQuizProblem = Omit<QuizProblem, 'problemJson'> & ProblemJson;

export function getSectionNameFromIdOrUri(
  idOrUri: string | undefined,
  sections: SecInfo[]
): string {
  if (!idOrUri || !sections) return 'Unknown Section';

  const section = sections.find((s) => s.id === idOrUri || s.uri === idOrUri) || undefined;

  return section?.title?.replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, '') || 'Unknown Section';
}

export type ProblemItem =
  | { type: 'generated'; data: FlatQuizProblem }
  | { type: 'existing'; data: { sectionId: string; uri: string } }
  | { type: 'all'; data: FlatQuizProblem | { sectionId: string; uri: string } };
const QuizGen = () => {
  const [generatedProblems, setGeneratedProblems] = useState<FlatQuizProblem[]>([]);
  const [existingProblemUris, setExistingProblemUris] = useState<
    { uri: string; sectionUri: string }[]
  >([]);
  const [latestGeneratedProblems, setLatestGeneratedProblems] = useState<FlatQuizProblem[]>([]);
  const [generatedIdx, setGeneratedIdx] = useState(0);
  const [existingIdx, setExistingIdx] = useState(0);
  const [allIdx, setAllIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'all' | 'generated' | 'existing'>('all');
  const [sections, setSections] = useState<SecInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const courseId = router.query.courseId as string;

  const currentIdx =
    viewMode === 'generated' ? generatedIdx : viewMode === 'existing' ? existingIdx : allIdx;

  const setCurrentIdx =
    viewMode === 'generated'
      ? setGeneratedIdx
      : viewMode === 'existing'
      ? setExistingIdx
      : setAllIdx;
  const problems = useMemo(() => {
    if (viewMode === 'generated') {
      return generatedProblems.map((p) => ({ type: 'generated', data: p } as const));
    }
    if (viewMode === 'existing') {
      return existingProblemUris.map((data) => ({ type: 'existing', data } as const));
    }
    // All
    return [
      ...generatedProblems.map((p) => ({ type: 'generated', data: p } as const)),
      ...existingProblemUris.map((data) => ({ type: 'existing', data } as const)),
    ];
  }, [viewMode, generatedProblems, existingProblemUris]);

  const currentProblem = problems[currentIdx] ?? problems[0];
  console.log({ currentProblem });
  const handleClick = () => {
    const url = `/course-view/${courseId}?sectionId=${encodeURIComponent(
      (currentProblem.data as any).sectionId
    )}`;
    window.open(url, '_blank');
  };
  console.log({ currentProblem });

  return (
    <Box display="flex" height="100vh" bgcolor="#f4f6f8">
      <Box flex={1} px={4} py={3} overflow="auto">
        <Typography variant="h3" fontWeight="bold" textAlign="center" color={PRIMARY_COL} mb={3}>
          Quiz Builder
        </Typography>
        <CourseSectionSelector
          courseId={courseId}
          setLoading={setLoading}
          sections={sections}
          setSections={setSections}
          setExistingProblemUris={setExistingProblemUris}
          setGeneratedProblems={setGeneratedProblems}
          setLatestGeneratedProblems={setLatestGeneratedProblems}
        />
        <Box display="flex" gap={2} my={1} position="relative">
          {['all', 'generated', 'existing'].map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? 'contained' : 'outlined'}
              color="primary"
              onClick={() => setViewMode(mode as any)}
              sx={{
                fontWeight: 500,
                borderRadius: 2,
                px: 3,
                py: 1,
                opacity: loading ? 0.6 : 1,
                position: 'relative',
              }}
            >
              {loading && (
                <CircularProgress
                  size={20}
                  sx={{
                    color: viewMode === mode ? 'white' : PRIMARY_COL,
                    position: 'absolute',
                    top: '30%',
                    left: '42%',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )}
              {mode === 'all'
                ? 'All'
                : mode === 'generated'
                ? 'Generated Problems'
                : 'Existing Problems'}
            </Button>
          ))}
        </Box>
        <Box mt={3}>
          {currentProblem ? (
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" color="#0d47a1">
                  Question {Math.min(currentIdx, problems.length - 1) + 1} of {problems.length}
                </Typography>
                <Tooltip title="Go to this section">
                  <Chip
                    icon={<Folder style={{ color: '#bbdefb' }} />}
                    label={`Section: ${getSectionNameFromIdOrUri(
                      (currentProblem.data as any)?.sectionId ||
                        (currentProblem.data as any).sectionUri,
                      sections
                    )}`}
                    variant="outlined"
                    onClick={handleClick}
                    clickable
                    sx={{
                      color: '#1976d2',
                      borderColor: '#1976d2',
                      fontWeight: 500,
                    }}
                  />
                </Tooltip>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <ListStepper
                  idx={currentIdx}
                  listSize={problems.length}
                  onChange={(idx) => setCurrentIdx(idx)}
                />
                {currentProblem?.type === 'existing' && (
                  <Tooltip title="View source">
                    <IconButton onClick={() => handleViewSource(currentProblem.data?.uri)}>
                      <OpenInNew />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              {currentProblem?.type === 'generated' ? (
                <>
                  <QuizProblemViewer problemData={currentProblem.data} />
                  <FeedbackSection
                    key={currentProblem.data.problemId}
                    problemId={currentProblem.data.problemId}
                  />
                </>
              ) : currentProblem?.type === 'existing' ? (
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  my={1.5}
                  p={1.5}
                  borderRadius={2}
                  border={'0.5px solid rgb(172, 178, 173)'}
                >
                  <UriProblemViewer uri={currentProblem.data?.uri} isSubmitted />
                </Box>
              ) : null}
              {currentProblem?.type === 'generated' && (
                <HiddenFeedback problemId={currentProblem.data.problemId} />
              )}
            </Card>
          ) : (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight="50vh"
              border="2px dashed #ccc"
              borderRadius={2}
              color="#999"
            >
              <Typography variant="h6">Generate a quiz to see them here!</Typography>
            </Box>
          )}
        </Box>
      </Box>
      <QuestionSidebar
        problems={[...generatedProblems, ...existingProblemUris]}
        generatedProblems={generatedProblems}
        latestGeneratedProblems={latestGeneratedProblems}
        currentIdx={currentIdx}
        setCurrentIdx={setCurrentIdx}
        sections={sections}
        viewMode={viewMode}
        existingProblems={existingProblemUris}
      />
    </Box>
  );
};

export default QuizGen;
