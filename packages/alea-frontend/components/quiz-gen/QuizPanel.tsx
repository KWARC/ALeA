import { Folder, OpenInNew, PublishedWithChanges } from '@mui/icons-material';
import { Box, Card, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import { generateQuizProblems, getLatestProblemDraft, QuizProblem } from '@stex-react/api';
import { handleViewSource, ListStepper, UriProblemViewer } from '@stex-react/stex-react-renderer';
import { useState } from 'react';
import {
  ExistingProblem,
  FlatQuizProblem,
  getSectionNameFromIdOrUri,
  isExisting,
  isGenerated,
} from '../../pages/quiz-gen';
import { SecInfo } from '../../types';
import { QuizProblemViewer } from '../GenerateQuiz';
import { FeedbackSection, HiddenFeedback } from './Feedback';
import { VariantDialog } from './VariantDialog';

export const handleGoToSection = (courseId: string, sectionId: string) => {
  const url = `/course-view/${courseId}?sectionId=${encodeURIComponent(sectionId)}`;
  window.open(url, '_blank');
};

export function flattenQuizProblem(qp: QuizProblem): FlatQuizProblem {
  return {
    problemId: qp.problemId,
    courseId: qp.courseId,
    sectionId: qp.sectionId,
    sectionUri: qp.sectionUri,
    problemStex: qp.problemStex,
    manualEdits: qp.manualEdits,
    ...qp.problemJson,
  };
}

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
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [copiedProblem, setCopiedProblem] = useState<FlatQuizProblem | null>(null);

  const createCopyAndCheckVariants = async (problemData: FlatQuizProblem | ExistingProblem) => {
    if (!problemData) return;

    let copiedProblem: QuizProblem | undefined;
    if ('problemId' in problemData) {
      const draft = await getLatestProblemDraft({ problemId: problemData.problemId });
      copiedProblem =
        draft && Object.keys(draft).length > 0
          ? draft
          : (await generateQuizProblems({ mode: 'copy', problemId: problemData.problemId }))?.[0];
    } else if ('uri' in problemData && courseId) {
      const draft = await getLatestProblemDraft({
        courseId,
        sectionId: problemData.sectionId,
        sectionUri: problemData.sectionUri,
        problemUri: problemData.uri,
      });
      copiedProblem =
        draft && Object.keys(draft).length > 0
          ? draft
          : (
              await generateQuizProblems({
                mode: 'copy',
                courseId,
                sectionId: problemData.sectionId,
                sectionUri: problemData.sectionUri,
                problemUri: problemData.uri,
              })
            )?.[0];
    }

    if (!copiedProblem) return;
    setCopiedProblem(flattenQuizProblem(copiedProblem));
  };

  const handleOpenVariantDialog = async () => {
    await createCopyAndCheckVariants(currentProblem);
    setVariantDialogOpen(true);
  };

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
          <Tooltip title="Create a new Variant">
            <PublishedWithChanges onClick={handleOpenVariantDialog} />
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

      <VariantDialog
        open={variantDialogOpen}
        onClose={() => setVariantDialogOpen(false)}
        problemData={copiedProblem}
      />
    </Box>
  );
}
