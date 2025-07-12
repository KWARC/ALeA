import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Radio,
  Checkbox,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Card,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Cancel, CheckCircle, ContentCopy, ExpandMore, MenuOpen } from '@mui/icons-material';
import { ListStepper } from '@stex-react/stex-react-renderer';
import { PRIMARY_COL } from '@stex-react/utils';
import { generateMoreQuizProblems, generateQuizProblems } from '@stex-react/api';
import { FlatQuizProblem } from '../pages/quiz-gen';
import { FeedbackSection } from './quiz-gen/Feedback';
import { QuestionSidebar } from './quiz-gen/QuizSidebar';

export const QuizProblemViewer = ({ problemData }: { problemData: FlatQuizProblem }) => {
  const isCorrectOption = (opt: string) => {
    if (problemData.problemType.toLowerCase() === 'mcq') {
      const correctAnswers = (problemData as any).correctAnswers || problemData.correctAnswer;
      if (Array.isArray(correctAnswers)) return correctAnswers.includes(opt);
      return correctAnswers === opt;
    }
    return opt === problemData.correctAnswer;
  };
  const renderOptionsWithFeedback = () =>
    problemData.options.map((opt, idx) => {
      const correct = isCorrectOption(opt);
      const icon = correct ? <CheckCircle color="success" /> : <Cancel color="error" />;
      const label = correct ? 'Correct' : 'Incorrect';
      const explanation =
        problemData.optionExplanations?.[opt] ||
        (correct ? 'This is correct.' : 'This is incorrect.');

      const optionLabel = (
        <Box display="flex" flexDirection="column">
          <Typography>{opt}</Typography>
          <Typography fontSize="0.875rem" mt={0.5}>
            <Typography color={correct ? 'success' : 'error'}>Insights</Typography> {explanation}
          </Typography>
        </Box>
      );

      return (
        <Box
          key={idx}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={1.5}
          p={1.5}
          borderRadius={2}
          border={'0.5px solid rgb(172, 178, 173)'}
        >
          <Box display="flex" alignItems="center" gap={1} flexGrow={1}>
            {problemData.problemType.toLowerCase() === 'mcq' ? (
              <Checkbox checked={correct} disabled />
            ) : (
              <Radio checked={correct} disabled />
            )}
            {optionLabel}
          </Box>
          <Chip
            icon={icon}
            label={label}
            variant="outlined"
            color={correct ? 'success' : 'error'}
          />
        </Box>
      );
    });

  return (
    <Box my={3} p={2} border="1px solid #ccc" borderRadius={2}>
      <Box display="flex" justifyContent="space-between" gap={1}>
        <Typography variant="h6" mb={2}>
          {problemData.problem}
        </Typography>
        <Tooltip title="Copy as STeX" arrow>
          <IconButton
            color="primary"
            size="small"
            onClick={() => navigator.clipboard.writeText(problemData?.problemStex)}
            sx={{
              marginRight: '8px',
            }}
            disabled={!problemData.problemStex}
          >
            <ContentCopy />
          </IconButton>
        </Tooltip>
      </Box>
      {(problemData.problemType.toLowerCase() === 'scq' ||
        problemData.problemType.toLowerCase() === 'mcq') &&
        renderOptionsWithFeedback()}

      {problemData.problemType === 'FILL_IN' && (
        <Box
          display="flex"
          alignItems="center"
          gap={2}
          p={2}
          bgcolor="#e3f2fd"
          border="1px solid #64b5f6"
          borderRadius={2}
        >
          <TextField
            variant="outlined"
            size="small"
            value={
              Array.isArray(problemData.correctAnswer)
                ? problemData.correctAnswer.join(', ')
                : problemData.correctAnswer
            }
            fullWidth
            disabled
            label="Correct Answer"
          />
          <Chip icon={<CheckCircle />} label="Correct" color="success" />
        </Box>
      )}
      {problemData.explanation && (
        <Typography fontSize="0.875rem" color="text.secondary" mt={0.5}>
          <Typography component="span" sx={{ color: PRIMARY_COL, fontWeight: 500 }}>
            Explanation:
          </Typography>{' '}
          {problemData.explanation}
        </Typography>
      )}
    </Box>
  );
};

const QuizComponent = ({ courseId, sectionId }: { courseId: string; sectionId: string }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [problems, setPoblems] = useState<FlatQuizProblem[]>([]);
  const [latestGeneratedQuestions, setLatestGeneratedQuestions] = useState<FlatQuizProblem[]>([]);
  const [hasPriorProblems, setHasPriorProblems] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleGenerate = async (mode: 'initial' | 'more' = 'initial', e: any) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const fetchFn = mode === 'more' ? generateMoreQuizProblems : generateQuizProblems;
      const response = await fetchFn(courseId, sectionId, sectionId);

      if (!response?.length) {
        return;
      }
      const parsed: FlatQuizProblem[] = response.map(({ problemJson, ...rest }) => ({
        ...rest,
        ...problemJson,
      }));
      setHasPriorProblems(true);
      setLatestGeneratedQuestions(parsed);
      setPoblems((prev) => (mode === 'more' ? [...prev, ...parsed] : parsed));
      setShowQuiz(true);
    } catch (error) {
      console.error('Error generating problems:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentProblem = problems[currentIdx];

  return (
    <>
      <Accordion expanded={showQuiz} onChange={() => setShowQuiz(!showQuiz)} sx={{ my: 1 }}>
        <AccordionSummary
          expandIcon={<ExpandMore />}
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <Typography variant="h6" sx={{ flexGrow: 1, color: PRIMARY_COL }}>
            Generate Quiz Problems
          </Typography>
          {showQuiz ? (
            hasPriorProblems ? (
              <Button
                onClick={(e) => handleGenerate('more', e)}
                variant="outlined"
                size="small"
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate More'}
              </Button>
            ) : (
              <Button
                onClick={(e) => handleGenerate('initial', e)}
                variant="contained"
                size="small"
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate'}
              </Button>
            )
          ) : hasPriorProblems ? (
            <Button
              onClick={(e) => handleGenerate('more', e)}
              variant="outlined"
              size="small"
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate More'}
            </Button>
          ) : (
            <Button
              onClick={(e) => handleGenerate('initial', e)}
              variant="contained"
              size="small"
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate'}
            </Button>
          )}

          {showQuiz && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(!sidebarOpen);
              }}
              sx={{ ml: 1 }}
            >
              <MenuOpen />
            </IconButton>
          )}
        </AccordionSummary>

        <AccordionDetails>
          {problems.length === 0 ? (
            <Typography variant="body1" color="textSecondary">
              Click Generate to create problems.
            </Typography>
          ) : (
            <Box display="flex">
              <Box flex={1} sx={{ overflow: 'auto' }}>
                <Card
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h5" color={PRIMARY_COL}>
                      Question {currentIdx + 1} of {problems.length}
                    </Typography>
                  </Box>

                  <ListStepper
                    idx={currentIdx}
                    listSize={problems.length}
                    onChange={(idx) => setCurrentIdx(idx)}
                  />

                  <QuizProblemViewer problemData={currentProblem} />

                  <FeedbackSection
                    key={currentProblem.problemId}
                    problemId={currentProblem.problemId}
                  />
                </Card>
              </Box>
              {sidebarOpen && (
                <QuestionSidebar
                  problems={problems}
                  latestGeneratedProblems={latestGeneratedQuestions}
                  currentIdx={currentIdx}
                  setCurrentIdx={setCurrentIdx}
                  hideSections
                />
              )}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    </>
  );
};
export default QuizComponent;
