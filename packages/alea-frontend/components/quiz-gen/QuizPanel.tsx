import { Folder, OpenInNew } from '@mui/icons-material';
import { Box, Card, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import { handleViewSource, ListStepper, UriProblemViewer } from '@stex-react/stex-react-renderer';
import {
  ExistingProblem,
  FlatQuizProblem,
  getSectionNameFromIdOrUri,
  isExisting,
  isGenerated,
} from 'packages/alea-frontend/pages/quiz-gen';
import { SecInfo } from 'packages/alea-frontend/types';
import { QuizProblemViewer } from '../GenerateQuiz';
import { FeedbackSection, HiddenFeedback } from './Feedback';

export const handleGoToSection = (courseId: string, sectionId: string) => {
  const url = `/course-view/${courseId}?sectionId=${encodeURIComponent(sectionId)}`;
  window.open(url, '_blank');
};

export function QuizPanel({
  problems,
  currentIdx,
  setCurrentIdx,
  sections,
  courseId,
}: {
  problems: (FlatQuizProblem | ExistingProblem)[];
  currentIdx: number;
  setCurrentIdx: (idx: number) => void;
  sections: SecInfo[];
  courseId: string;
}) {
  const currentProblem = problems[currentIdx] ?? problems[0];

  if (!currentProblem) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
        border="2px dashed #ccc"
        borderRadius={2}
        color="#999"
        mt={3}
      >
        <Typography variant="h6">Generate a quiz to see them here!</Typography>
      </Box>
    );
  }

  return (
    <Box mt={3}>
      <Card sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" color="#0d47a1">
            Question {Math.min(currentIdx, problems.length - 1) + 1} of {problems.length}
          </Typography>
          <Tooltip title="Go to this section">
            <Chip
              icon={<Folder style={{ color: '#bbdefb' }} />}
              label={`Section: ${getSectionNameFromIdOrUri(currentProblem.sectionId, sections)}`}
              variant="outlined"
              onClick={() => handleGoToSection(courseId, currentProblem.sectionId)}
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
          <ListStepper idx={currentIdx} listSize={problems.length} onChange={setCurrentIdx} />
          {isExisting(currentProblem) && (
            <Tooltip title="View source">
              <IconButton onClick={() => handleViewSource(currentProblem.uri)}>
                <OpenInNew />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {isGenerated(currentProblem) ? (
          <>
            <QuizProblemViewer problemData={currentProblem} />
            <FeedbackSection key={currentProblem.problemId} problemId={currentProblem.problemId} />
          </>
        ) : isExisting(currentProblem) ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            my={1.5}
            p={1.5}
            borderRadius={2}
            border="0.5px solid rgb(172, 178, 173)"
          >
            <UriProblemViewer uri={currentProblem.uri} isSubmitted />
          </Box>
        ) : null}

        {isGenerated(currentProblem) && <HiddenFeedback problemId={currentProblem.problemId} />}
      </Card>
    </Box>
  );
}
