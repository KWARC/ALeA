import { FTML } from '@flexiformal/ftml';
import DeleteIcon from '@mui/icons-material/Delete';
import CommentOutlinedIcon from '@mui/icons-material/CommentOutlined';
import GradeOutlinedIcon from '@mui/icons-material/GradeOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
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
      />
      {gradesToShow.map((item, idx) => {
        const numericSubProblemId = Number(item.subProblemId);
        const subProblemLabel = Number.isFinite(numericSubProblemId)
          ? `Sub-problem ${numericSubProblemId + 1}`
          : `Sub-problem ${idx + 1}`;
        const subProblem = subProblemsByGradeId[item.id];
        const label = gradesToShow.length > 1 ? subProblemLabel : 'Feedback';
        const isExpanded = expandedIds.has(item.id);

        return (
          <Accordion
            key={item.id}
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
                <CommentOutlinedIcon sx={{ color: 'primary.main', fontSize: 14 }} />
                <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1 }}>
                  {label}
                </Typography>
                {gradesToShow.length > 1 && (
                  <Chip label={`#${idx + 1}`} size="small" sx={feedbackStyles.indexChip} />
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
              {subProblem && (
                <>
                  <SafeHtml html={subProblem.html || subProblem.titleHtml} />
                  <Box sx={feedbackStyles.answerSection}>
                    <Box sx={feedbackStyles.answerLabel}>
                      <Typography variant="caption" sx={feedbackStyles.sectionLabelText}>
                        Student Answer
                      </Typography>
                    </Box>
                    <Box sx={feedbackStyles.answerContent}>
                      <MdViewer content={item.answer || '*Unanswered*'} />
                    </Box>
                  </Box>
                  <Divider sx={{ my: 0.75 }} />
                </>
              )}
              <Box sx={feedbackStyles.gradingSection}>
                <Box sx={feedbackStyles.gradingHeader}>
                  <GradeOutlinedIcon sx={{ color: 'text.secondary', fontSize: 14 }} />
                  <Typography variant="caption" sx={feedbackStyles.sectionLabelText}>
                    Score &amp; Feedback
                  </Typography>
                </Box>
                <GradingDisplay gradingInfo={item} />
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}

const feedbackStyles = {
  accordion: {
    mt: 1,
    border: 1,
    borderColor: 'divider',
    borderRadius: '6px !important',
    overflow: 'hidden',
    bgcolor: 'background.paper',
    '&:before': { display: 'none' },
    '&.Mui-expanded': {
      mt: 1,
    },
  },
  accordionSummary: {
    px: 1.25,
    py: 0,
    minHeight: '32px !important',
    bgcolor: 'grey.50',
    borderBottom: 1,
    borderColor: 'divider',
    '& .MuiAccordionSummary-content': {
      display: 'flex',
      alignItems: 'center',
      my: '6px',
    },
    '& .MuiAccordionSummary-expandIconWrapper': {
      order: 3,
    },
  },
  accordionDetails: {
    p: 1.25,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    flex: 1,
  },
  indexChip: {
    bgcolor: 'primary.50',
    color: 'primary.main',
    fontWeight: 600,
    height: 16,
    fontSize: '0.65rem',
  },
  answerSection: {
    mt: 0.75,
    border: 1,
    borderColor: 'grey.300',
    borderRadius: 1,
    overflow: 'hidden',
  },
  answerLabel: {
    px: 1,
    py: 0.25,
    bgcolor: 'grey.100',
    borderBottom: 1,
    borderColor: 'grey.300',
  },
  sectionLabelText: {
    fontWeight: 600,
    color: 'text.secondary',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    fontSize: '0.65rem',
  },
  answerContent: {
    px: 1,
    py: 0.5,
    bgcolor: 'background.paper',
  },
  gradingSection: {
    mt: 0.25,
  },
  gradingHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    mb: 0.5,
  },
} as const;
