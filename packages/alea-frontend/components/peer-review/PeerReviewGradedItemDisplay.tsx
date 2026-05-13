import { FTML } from '@flexiformal/ftml';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { contentFragment } from '@flexiformal/ftml-backend';
import { FTMLProblemWithSolution, GradingWithAnswer } from '@alea/spec';
import { MdViewer } from '@alea/markdown';
import { ProblemDisplay } from '@alea/stex-react-renderer';
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
  const [problemSlotIds, setProblemSlotIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (gradesToShow.length > 0) {
      setExpandedIds(new Set([gradesToShow[0].id]));
    }
  }, [gradesToShow.map((g) => g.id).join(',')]);

  const handleToggle = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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

        setProblemSlotIds([]);
      } catch {
        if (!isMounted) return;
        setProblem(undefined);
        setAnswerText(undefined);
        setProblemSlotIds([]);
      }
    }
    loadProblem();
    return () => {
      isMounted = false;
    };
  }, [primary, gradesToShow]);

  if (!primary) return null;

  function findGradeForProblem(problemId: string, isSubProblem: boolean) {
    if (!isSubProblem && gradesToShow.length === 1 && problemSlotIds.length === 0) return primary;
    const direct = gradesToShow.find(
      (item) => String(item.subProblemId ?? '').trim() === problemId
    );
    if (direct) return direct;
    const byRenderedIndex = gradesToShow.find((item) => {
      const idx = Number(item.subProblemId);
      return Number.isFinite(idx) && problemSlotIds[idx] === problemId;
    });
    if (byRenderedIndex) return byRenderedIndex;
    const idx = problemSlotIds.indexOf(problemId);
    if (isSubProblem && idx >= 0 && gradesToShow.length === problemSlotIds.length) {
      return gradesToShow[idx];
    }
  }

  function GradeFeedback({
    problemId,
    isSubProblem,
  }: {
    problemId: string;
    isSubProblem: boolean;
  }) {
    useEffect(() => {
      if (!isSubProblem) return;
      setProblemSlotIds((prev) => (prev.includes(problemId) ? prev : [...prev, problemId]));
    }, [problemId, isSubProblem]);

    if (!isSubProblem && problemSlotIds.length > 0) return null;
    const item = findGradeForProblem(problemId, isSubProblem);
    if (!item) return null;

    const idx = gradesToShow.findIndex((g) => g.id === item.id);
    const numericSubProblemId = Number(item.subProblemId);
    const subProblemLabel = Number.isFinite(numericSubProblemId)
      ? `Sub-problem ${numericSubProblemId + 1}`
      : `Sub-problem ${idx + 1}`;
    const label = gradesToShow.length > 1 ? subProblemLabel : 'Feedback';
    const isExpanded = expandedIds.has(item.id);

    return (
      <Accordion
        expanded={isExpanded}
        onChange={() => handleToggle(item.id)}
        disableGutters
        elevation={0}
        sx={feedbackStyles.accordion}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ fontSize: 16, color: 'primary.main' }} />}
          sx={feedbackStyles.accordionSummary}
        >
          <Box sx={feedbackStyles.headerLeft}>
            <StarBorderIcon sx={feedbackStyles.scoreIcon} />
            <Typography variant="caption" sx={feedbackStyles.scoreLabel}>
              Score
            </Typography>
            <Typography component="span" sx={feedbackStyles.scoreChip}>
              {item.totalPoints}
            </Typography>
            {gradesToShow.length > 1 && (
              <Chip label={label} size="small" sx={feedbackStyles.indexChip} />
            )}
          </Box>
          <Tooltip title="Delete feedback" arrow placement="top">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              aria-label="delete"
              color="primary"
              sx={{ p: 0.25, ml: 'auto', mr: 0.5 }}
            >
              <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </AccordionSummary>

        <AccordionDetails sx={feedbackStyles.accordionDetails}>
          <Box sx={feedbackStyles.answerSection}>
            <Typography variant="caption" sx={feedbackStyles.sectionLabelText}>
              Student Answer
            </Typography>
            <Box sx={feedbackStyles.answerContent}>
              <MdViewer content={item.answer || '*Unanswered*'} />
            </Box>
          </Box>
          <Box sx={feedbackStyles.feedbackSection}>
            <Typography variant="caption" sx={feedbackStyles.sectionLabelText}>
              Feedback
            </Typography>
            <Box sx={feedbackStyles.feedbackContent}>
              {item.customFeedback ? (
                <MdViewer content={item.customFeedback} />
              ) : (
                <Typography sx={feedbackStyles.emptyFeedback}>No feedback provided.</Typography>
              )}
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  }

  const feedbackRevision = [
    problemSlotIds.join('|'),
    gradesToShow
      .map((g) => `${g.id}:${g.updatedAt}:${expandedIds.has(g.id) ? 'open' : 'closed'}`)
      .join('|'),
  ].join('::');

  return (
    <Box>
      <ProblemDisplay
        key={`${primary.questionId}-${feedbackRevision}`}
        showPoints={false}
        problem={problem}
        isFrozen={true}
        r={answerText}
        uri={primary.questionId}
        hideAnswerAccepter
        renderBelowAnswerAccepter={(problemId, isSubProblem) => (
          <GradeFeedback problemId={problemId} isSubProblem={isSubProblem} />
        )}
      />
    </Box>
  );
}

const feedbackStyles = {
  accordion: {
    mt: 1,
    border: 1,
    borderColor: '#b7dfbd',
    borderRadius: '6px !important',
    overflow: 'hidden',
    bgcolor: '#f7fcf8',
    '&:before': { display: 'none' },
    '&.Mui-expanded': {
      mt: 1,
    },
  },
  accordionSummary: {
    px: 1.5,
    py: 0,
    minHeight: '52px !important',
    bgcolor: '#f7fcf8',
    borderBottom: 1,
    borderColor: '#b7dfbd',
    '& .MuiAccordionSummary-content': {
      display: 'flex',
      alignItems: 'center',
      my: 0,
    },
    '& .MuiAccordionSummary-expandIconWrapper': {
      order: 3,
      color: '#2e7d32',
    },
  },
  accordionDetails: {
    p: 0,
    bgcolor: '#f7fcf8',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    flex: 1,
  },
  scoreIcon: {
    color: '#2e7d32',
    fontSize: 20,
  },
  scoreLabel: {
    color: '#2e7d32',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: 0.4,
    lineHeight: 1,
    textTransform: 'uppercase' as const,
  },
  scoreChip: {
    px: 1,
    py: 0.25,
    borderRadius: 999,
    bgcolor: '#d9f2dd',
    color: '#1b5e20',
    fontSize: '0.75rem',
    fontWeight: 700,
    lineHeight: 1,
  },
  indexChip: {
    bgcolor: '#e8f5e9',
    color: '#2e7d32',
    fontWeight: 600,
    height: 24,
    fontSize: '0.75rem',
  },
  answerSection: {
    px: 1.5,
    py: 1.5,
    borderBottom: 1,
    borderColor: '#b7dfbd',
  },
  sectionLabelText: {
    display: 'block',
    fontWeight: 700,
    color: '#2e7d32',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
    fontSize: '0.75rem',
  },
  answerContent: {
    mt: 1.5,
    color: 'text.primary',
    fontSize: '0.875rem',
    lineHeight: 1.45,
    '& p': {
      my: 0,
    },
  },
  feedbackSection: {
    px: 1.5,
    py: 1.5,
  },
  feedbackContent: {
    mt: 1,
    color: 'text.primary',
    fontSize: '0.875rem',
    lineHeight: 1.45,
    '& p': {
      my: 0,
    },
  },
  emptyFeedback: {
    color: 'text.secondary',
    fontSize: '0.875rem',
  },
} as const;
