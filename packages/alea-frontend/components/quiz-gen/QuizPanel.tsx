import { OpenInNew } from '@mui/icons-material';
import { Box, Card, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import {
  generateQuizProblems,
  getFinalizedVariants,
  getLatestProblemDraft,
  QuizProblem,
  UserInfo,
} from '@alea/spec';
import { handleViewSource, ListStepper, UriProblemViewer } from '@alea/stex-react-renderer';
import { useEffect, useState } from 'react';
import { ExistingProblem, FlatQuizProblem, isExisting, isGenerated } from '../../pages/quiz-gen';
import { SecInfo } from '../../types';
import { QuizProblemViewer } from '../GenerateQuiz';
import { FeedbackSection, HiddenFeedback } from './Feedback';
import { QuizPanelHeader } from './QuizPanelHeader';
import { VariantDialog } from './VariantDialog';

export const handleGoToSection = async (courseId: string, sectionId: string) => {
  const { getAllCourses } = await import('@alea/spec');
  const courses = await getAllCourses();
  const course = courses[courseId];
  const institutionId = course?.universityId || 'FAU';
  const url = `/${institutionId}/${courseId}/latest/course-view?sectionId=${encodeURIComponent(sectionId)}`;
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
  userInfo,
  hideVariantGeneration=false,
}: {
  problems: (FlatQuizProblem | ExistingProblem)[];
  currentIdx: number;
  setCurrentIdx: (idx: number) => void;
  sections: SecInfo[];
  courseId: string;
  userInfo: UserInfo | undefined;
  hideVariantGeneration?:boolean;
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
    if (!problemData) return false;

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

    if (!copiedProblem) return false;
    setCopiedProblem(flattenQuizProblem(copiedProblem));
    return true;
  };

  const handleOpenVariantDialog = async () => {
    setLoading(true);
    let success = false;
    try {
      success = await createCopyAndCheckVariants(currentProblem);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
    if (success) {
      setVariantDialogOpen(true);
    }
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
        <QuizPanelHeader
          currentIdx={currentIdx}
          totalProblems={problems.length}
          currentProblem={currentProblem}
          sections={sections}
          courseId={courseId}
          finalizedProblems={finalizedProblems}
          selectedProblemIndex={selectedProblemIndex}
          onVariantChange={handleVariantChange}
          onGoToSection={handleGoToSection}
          onOpenVariantDialog={handleOpenVariantDialog}
          hideVariantGeneration={hideVariantGeneration}
        />

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
          <Typography variant="body2" color="#b07575ff" mt={1}>
            This is the finalized version created from the original problem.{' '}
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
          userInfo={userInfo}
        />
      )}
    </Box>
  );
}
