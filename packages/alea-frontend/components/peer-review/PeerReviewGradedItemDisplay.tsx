import { FTML } from '@flexiformal/ftml';
import DeleteIcon from '@mui/icons-material/Delete';
import { Box, IconButton, Typography } from '@mui/material';
import { contentFragment } from '@flexiformal/ftml-backend';
import { FTMLProblemWithSolution, GradingWithAnswer } from '@alea/spec';
import { SafeHtml } from '@alea/react-utils';
import { MdViewer } from '@alea/markdown';
import { GradingDisplay, ProblemDisplay } from '@alea/stex-react-renderer';
import { parseContentFragmentTuple } from '@alea/quiz-utils';
import { useEffect, useMemo, useState } from 'react';

export function PeerReviewGradedItemDisplay({
  grade,
  grades,
  onDelete,
}: {
  grade?: GradingWithAnswer;
  grades?: GradingWithAnswer[];
  onDelete: (id: number) => void;
}) {
  const gradesToShow = useMemo(() => grades ?? (grade ? [grade] : []), [grade, grades]);
  const primary = gradesToShow[0];
  const [problem, setProblem] = useState<FTMLProblemWithSolution>();
  const [answerText, setAnswerText] = useState<FTML.ProblemResponse>();
  const [subProblemsByGradeId, setSubProblemsByGradeId] = useState<
    Record<number, { titleHtml: string; html: string }>
  >({});

  useEffect(() => {
    if (!primary) return;
    let isMounted = true;
    async function loadProblem() {
      try {
        const fragmentResponse = await contentFragment({ uri: primary.questionId });
        if (!isMounted) return;
        const { titleHtml, html } = parseContentFragmentTuple(fragmentResponse);
        setProblem({
          problem: {
            uri: primary.questionId,
            html,
            title_html: titleHtml,
          },
          answerClasses: [],
        });
        const responses = [] as FTML.ProblemResponse['responses'];
        for (const item of gradesToShow) {
          const subProblemIdx = Number(item.subProblemId);
          if (Number.isFinite(subProblemIdx)) {
            responses[subProblemIdx] = {
              type: 'Fillinsol',
              value: item.answer,
            };
          }
        }
        setAnswerText({
          uri: primary.questionId,
          responses,
        });

        const subProblems: Record<number, { titleHtml: string; html: string }> = {};
        for (const item of gradesToShow) {
          const subProblemId = String(item.subProblemId ?? '').trim();
          if (!/^https?:\/\//i.test(subProblemId)) continue;
          try {
            subProblems[item.id] = parseContentFragmentTuple(
              await contentFragment({ uri: subProblemId })
            );
          } catch {
            // Fall back to the label when the sub-problem fragment is unavailable.
          }
        }
        if (!isMounted) return;
        setSubProblemsByGradeId(subProblems);
      } catch {
        if (!isMounted) return;
        setProblem(undefined);
        setAnswerText(undefined);
        setSubProblemsByGradeId({});
      }
    }
    loadProblem();
    return () => {
      isMounted = false;
    };
  }, [primary, gradesToShow]);

  if (!primary) return null;

  return (
    <Box>
      <ProblemDisplay
        showPoints={false}
        problem={problem}
        isFrozen={true}
        r={answerText}
        uri={primary.questionId}
      ></ProblemDisplay>
      {gradesToShow.map((item, idx) => {
        const numericSubProblemId = Number(item.subProblemId);
        const subProblemLabel = Number.isFinite(numericSubProblemId)
          ? `Sub-problem ${numericSubProblemId + 1}`
          : `Sub-problem ${idx + 1}`;
        const subProblem = subProblemsByGradeId[item.id];
        return (
          <Box key={item.id} sx={feedbackStyles.card}>
            <Box sx={feedbackStyles.header}>
              <Typography variant="subtitle2">
                {gradesToShow.length > 1 ? subProblemLabel : 'Feedback'}
              </Typography>
              <IconButton
                size="small"
                onClick={() => onDelete(item.id)}
                aria-label="delete"
                color="primary"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
            <Box sx={feedbackStyles.body}>
              {subProblem ? (
                <>
                  <SafeHtml html={subProblem.html || subProblem.titleHtml} />
                  <Box sx={feedbackStyles.answer}>
                    <MdViewer content={item.answer || '*Unanswered*'} />
                  </Box>
                </>
              ) : null}
              <Box sx={subProblem ? feedbackStyles.grading : undefined}>
                <GradingDisplay gradingInfo={item} />
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

const feedbackStyles = {
  card: {
    mt: 1.5,
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
    overflow: 'hidden',
    bgcolor: 'background.paper',
  },
  header: {
    p: 1.5,
    bgcolor: 'grey.50',
    borderBottom: 1,
    borderColor: 'divider',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  body: {
    p: 1.5,
  },
  answer: {
    mt: 1,
    border: 2,
    borderColor: 'grey.400',
    pl: 1.25,
    bgcolor: 'grey.200',
    borderRadius: 1,
  },
  grading: {
    mt: 1.25,
  },
} as const;
