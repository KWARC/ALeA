import { Folder, OpenInNew, PublishedWithChanges } from '@mui/icons-material';
import {
  Box,
  Card,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  generateQuizProblems,
  getFinalizedVariants,
  getLatestProblemDraft,
  QuizProblem,
} from '@stex-react/api';
import { handleViewSource, ListStepper, UriProblemViewer } from '@stex-react/stex-react-renderer';
import { useEffect, useState } from 'react';
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
  const result: FlatQuizProblem = {
    problemId: qp.problemId,
    courseId: qp.courseId,
    sectionId: qp.sectionId,
    sectionUri: qp.sectionUri,
    problemStex: qp.problemStex,
    manualEdits: qp.manualEdits,
    generationParams: qp.generationParams,
    isDraft: qp.isDraft,
    createdAt: qp.createdAt,
    updatedAt: qp.updatedAt,
    ...qp.problemJson, 
  };
  if (qp.problemUri) {
    result.problemUri = qp.problemUri;
  }
  return result;
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
  const [loading, setLoading] = useState<boolean>(false);
  const [finalizedProblems, setFinalizedProblems] = useState<QuizProblem[]>([]);
  const [selectedProblemIndex, setSelectedProblemIndex] = useState<number | null>(null);
  const [finalizedProblemData, setFinalizedProblemData] = useState<FlatQuizProblem | null>();

  useEffect(() => {
    async function finalVariants() {
      if (!currentProblem) return;
      let finalizedVariants: QuizProblem[];
      if ('problemId' in currentProblem && currentProblem.problemId) {
        finalizedVariants = await getFinalizedVariants({ problemId: currentProblem.problemId });
      } else if ('uri' in currentProblem && currentProblem.uri) {
        finalizedVariants = await getFinalizedVariants({ problemUri: currentProblem.uri });
      }
      setFinalizedProblems(finalizedVariants);
      console.log({ setFinalizedProblemData });
      if (finalizedVariants.length > 0) {
        setSelectedProblemIndex(0);
        setFinalizedProblemData(flattenQuizProblem(finalizedVariants[0]));
      } else {
        setSelectedProblemIndex(null);
        setFinalizedProblemData(null);
      }
      setSelectedProblemIndex(null);
      setFinalizedProblemData(null);
    }
    finalVariants();
  }, [currentProblem]);

  const handleVariantChange = (value: number) => {
    console.log({ value });
    if (value === null) {
      setSelectedProblemIndex(null);
      setFinalizedProblemData(null);
      console.log({ setFinalizedProblemData });
      return;
    }

    const idx = Number(value);
    setSelectedProblemIndex(idx);

    const selectedVariant = finalizedProblems?.[idx];
    if (selectedVariant) {
      setFinalizedProblemData(flattenQuizProblem(selectedVariant));
      console.log({ setFinalizedProblemData });
    }
  };

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
    setLoading(true);
    try {
      await createCopyAndCheckVariants(currentProblem);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
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
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
          overflow="auto"
        >
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
          <FormControl size="small" sx={{ minWidth: '100px', m: 1 }}>
            <InputLabel>Variants</InputLabel>
            <Select
              value={selectedProblemIndex ?? ''}
              onChange={(e) => handleVariantChange(e.target.value as number)}
              label="Variants"
            >
              <MenuItem value={null}>None</MenuItem>
              {finalizedProblems?.map((variant, idx) => (
                <MenuItem key={variant.problemId} value={idx}>
                  Variant {idx + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
        {finalizedProblemData && (
          <Typography variant="body2" color="#ff1f1fff" mt={1}>
            This is a finalized variant of the original problem.
          </Typography>
        )}

        {isGenerated(currentProblem) ? (
          <>
            <QuizProblemViewer problemData={finalizedProblemData ?? currentProblem} />
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
            {finalizedProblemData ? (
              <QuizProblemViewer problemData={finalizedProblemData} />
            ) : (
              <UriProblemViewer uri={currentProblem.uri} isSubmitted />
            )}
          </Box>
        ) : null}

        {isGenerated(currentProblem) && <HiddenFeedback problemId={currentProblem.problemId} />}
      </Card>
      {loading ? (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(255,255,255,0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <VariantDialog
          open={variantDialogOpen}
          onClose={() => setVariantDialogOpen(false)}
          problemData={copiedProblem}
          setProblemData={setCopiedProblem}
        />
      )}
    </Box>
  );
}
