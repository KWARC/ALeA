import { FTML } from '@flexiformal/ftml';
import { SettingsBackupRestore } from '@mui/icons-material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import {
  AnswerResponse,
  FTMLProblemWithSolution,
  getGradingItems,
  getMyAnswers,
  GradingInfo,
  ReviewType,
} from '@alea/spec';
import { SafeHtml, useCurrentUser } from '@alea/react-utils';
import { AnswerContext, ProblemDisplay } from '@alea/stex-react-renderer';
import { contentFragment } from '@flexiformal/ftml-backend';
import { getProblemPointsFromDocument, parseContentFragmentTuple } from '@alea/quiz-utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { MultiItemSelector } from '../components/nap/MultiItemsSelector';
import {
  addProblemSlot,
  buildProblemResponse,
  findItemForProblemSlot,
} from '../components/peer-review/problem-display-utils';
import MainLayout from '../layouts/MainLayout';

const MULTI_SELECT_FIELDS = ['courseId', 'questionId', 'courseInstance'] as const;
const ALL_SORT_FIELDS = ['courseId', 'questionTitle', 'updatedAt', 'courseInstance'] as const;
const DEFAULT_SORT_ORDER: Record<SortField, 'ASC' | 'DESC'> = {
  courseId: 'DESC',
  questionTitle: 'ASC',
  courseInstance: 'ASC',
  updatedAt: 'ASC',
};

type MultSelectField = (typeof MULTI_SELECT_FIELDS)[number];
type SortField = (typeof ALL_SORT_FIELDS)[number];
interface SortAndFilterParams {
  multiSelectField: Record<MultSelectField, (string | number)[]>;
  sortingFields: SortField[];
  sortOrders: Record<SortField, 'ASC' | 'DESC'>;
}
function AnswerItemOrganizer({
  answerItems,
  sortAndFilterParams,
  setSortAndFilterParams,
}: {
  answerItems: AnswerResponse[];
  sortAndFilterParams: SortAndFilterParams;
  setSortAndFilterParams: Dispatch<SetStateAction<SortAndFilterParams>>;
}) {
  const allCourses = useMemo(
    () => [...new Set(answerItems.map((c) => c.courseId))].map((i) => ({ value: i, title: i })),
    [answerItems]
  );
  const allInstance = useMemo(
    () =>
      [...new Set(answerItems.map((item) => item.courseInstance))].map((i) => ({
        value: i,
        title: i,
      })),
    [answerItems]
  );
  return (
    <Box sx={answerOrganizerStyles.root}>
      <Box sx={answerOrganizerStyles.filters}>
        <MultiItemSelector
          label="Courses"
          selectedValues={sortAndFilterParams.multiSelectField.courseId}
          allValues={allCourses}
          onUpdate={(courseId) =>
            setSortAndFilterParams((prev) => ({
              ...prev,
              multiSelectField: { ...prev.multiSelectField, courseId },
            }))
          }
        />
        <MultiItemSelector
          label="Instance"
          selectedValues={sortAndFilterParams.multiSelectField.courseInstance}
          allValues={allInstance}
          onUpdate={(courseInstance) =>
            setSortAndFilterParams((prev) => ({
              ...prev,
              multiSelectField: { ...prev.multiSelectField, courseInstance },
            }))
          }
        />
      </Box>

      <AnswerListSortFields
        sortAndFilterParams={sortAndFilterParams}
        setSortAndFilterParams={setSortAndFilterParams}
      />
    </Box>
  );
}
function sortGradingsForAnonymousOrder(grades: GradingInfo[]): GradingInfo[] {
  return [...grades].sort((a, b) => {
    if (a.reviewType !== b.reviewType) {
      if (a.reviewType === ReviewType.INSTRUCTOR) return -1;
      if (b.reviewType === ReviewType.INSTRUCTOR) return 1;
    }
    const ta = new Date(a.updatedAt).getTime();
    const tb = new Date(b.updatedAt).getTime();
    if (ta !== tb) return ta - tb;
    return a.id - b.id;
  });
}

function feedbackNotes(grading: GradingInfo): string {
  return String(grading.customFeedback ?? '').trim();
}

function reviewerLabel(grading: GradingInfo | undefined, idx: number): string {
  if (grading?.reviewType === ReviewType.INSTRUCTOR) {
    const name = String(grading.checkerName || grading.checkerId || '').trim();
    return `Instructor${name ? `: ${name}` : ''}`;
  }
  return `Reviewer ${idx + 1}`;
}

function getProblemLabel(questionId: string, fallbackIdx: number) {
  let problemId = questionId;
  try {
    problemId = new URL(questionId).searchParams.get('e') ?? questionId;
  } catch {
    // Keep the original id when it is not a URL.
  }

  const match = problemId.match(/problem[_/-]?(\d+)/i);
  return match ? `Problem ${match[1]}` : `Problem ${fallbackIdx + 1}`;
}

interface AnswerGroup {
  questionId: string;
  answers: AnswerResponse[];
  questionTitle: string;
  courseId: string;
  courseInstance: string;
  latestUpdatedAt: Date;
}

function groupAnswersByQuestion(items: AnswerResponse[]): AnswerGroup[] {
  const map = new Map<string, AnswerGroup>();
  for (const a of items) {
    const existing = map.get(a.questionId);
    if (existing) {
      existing.answers.push(a);
      if (new Date(a.updatedAt).getTime() > new Date(existing.latestUpdatedAt).getTime()) {
        existing.latestUpdatedAt = a.updatedAt;
      }
    } else {
      map.set(a.questionId, {
        questionId: a.questionId,
        answers: [a],
        questionTitle: a.questionTitle,
        courseId: a.courseId,
        courseInstance: a.courseInstance,
        latestUpdatedAt: a.updatedAt,
      });
    }
  }
  for (const group of map.values()) {
    group.answers.sort((x, y) => {
      const xn = Number(x.subProblemId);
      const yn = Number(y.subProblemId);
      if (Number.isFinite(xn) && Number.isFinite(yn)) return xn - yn;
      return String(x.subProblemId).localeCompare(String(y.subProblemId));
    });
  }
  return Array.from(map.values());
}

function AnswerItemDisplay({ answers }: { answers: AnswerResponse[] }) {
  const primary = answers[0];
  const [problem, setProblem] = useState<FTMLProblemWithSolution | undefined>();
  const [answerText, setAnswerText] = useState<FTML.ProblemResponse>();
  const [gradingsByAnswerId, setGradingsByAnswerId] = useState<Record<number, GradingInfo[]>>({});
  const [reviewerIdx, setReviewerIdx] = useState(0);
  const [problemSlotIds, setProblemSlotIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const [raw, points] = await Promise.all([
          contentFragment({ uri: primary.questionId }),
          getProblemPointsFromDocument(primary.questionId),
        ]);
        if (!isMounted) return;
        const { titleHtml, html } = parseContentFragmentTuple(raw);
        setProblem({
          problem: {
            uri: primary.questionId,
            html,
            title_html: titleHtml,
            total_points: points,
          },
          answerClasses: [],
        });
        setAnswerText(
          buildProblemResponse(
            primary.questionId,
            answers,
            (a) => a.subProblemId,
            (a) => a.answer
          )
        );

        const all: Record<number, GradingInfo[]> = {};
        for (const a of answers) {
          try {
            const list = await getGradingItems(a.id, String(a.subProblemId ?? ''));
            all[a.id] = list;
          } catch {
            all[a.id] = [];
          }
        }
        if (!isMounted) return;
        setGradingsByAnswerId(all);
        setReviewerIdx(0);
        setProblemSlotIds([]);
      } catch {
        if (isMounted) {
          setProblem(undefined);
          setAnswerText(undefined);
          setGradingsByAnswerId({});
          setProblemSlotIds([]);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [primary.questionId, answers]);

  function findAnswerForProblem(problemId: string, isSubProblem: boolean) {
    return findItemForProblemSlot(
      answers,
      problemId,
      isSubProblem,
      problemSlotIds,
      (a) => a.subProblemId
    );
  }

  function AnswerFeedback({
    problemId,
    isSubProblem,
  }: {
    problemId: string;
    isSubProblem: boolean;
  }) {
    useEffect(() => {
      if (!isSubProblem) return;
      setProblemSlotIds((prev) => addProblemSlot(prev, problemId));
    }, [problemId, isSubProblem]);

    if (!isSubProblem && problemSlotIds.length > 0) return null;
    const a = findAnswerForProblem(problemId, isSubProblem);
    if (!a) return null;

    const gradings = sortGradingsForAnonymousOrder(gradingsByAnswerId[a.id] ?? []);
    const safeIdx = Math.min(reviewerIdx, Math.max(0, gradings.length - 1));
    const selectedGrading = gradings.length > 0 ? gradings[safeIdx] : undefined;
    const notes = selectedGrading ? feedbackNotes(selectedGrading) : '';

    if (gradings.length === 0) {
      return (
        <Box sx={answerDisplayStyles.emptyFeedback}>
          No feedback received yet for this submission.
        </Box>
      );
    }
    if (!selectedGrading) return null;

    return (
      <Box sx={answerDisplayStyles.feedbackSummary}>
        <Box sx={answerDisplayStyles.feedbackMeta}>
          <Typography variant="caption" sx={answerDisplayStyles.feedbackLabel}>
            Score
          </Typography>
          <Typography variant="caption" sx={answerDisplayStyles.scorePill}>
            {selectedGrading.totalPoints}
          </Typography>
        </Box>
        {notes ? (
          <Box sx={answerDisplayStyles.feedbackNotes}>
            <Typography variant="caption" sx={answerDisplayStyles.feedbackLabel}>
              Feedback
            </Typography>
            <Typography variant="body2" sx={answerDisplayStyles.feedbackText}>
              {notes}
            </Typography>
          </Box>
        ) : null}
      </Box>
    );
  }

  const feedbackRevision = [
    problemSlotIds.join('|'),
    Object.entries(gradingsByAnswerId)
      .map(([answerId, gradings]) => `${answerId}:${gradings.map((g) => g.id).join(',')}`)
      .join('|'),
    reviewerIdx,
  ].join('::');
  const reviewerCount = Math.max(0, ...answers.map((a) => (gradingsByAnswerId[a.id] ?? []).length));
  const safeReviewerIdx = Math.min(reviewerIdx, Math.max(0, reviewerCount - 1));
  const reviewerOptions = Array.from({ length: reviewerCount }, (_, i) => {
    const grading = answers
      .map((a) => sortGradingsForAnonymousOrder(gradingsByAnswerId[a.id] ?? [])[i])
      .find(Boolean);
    return reviewerLabel(grading, i);
  });
  const answerContext = useMemo(() => {
    const responses = answers.map((a) => {
      const numericSubProblemId = Number(a.subProblemId);
      const renderedSubProblemId = Number.isFinite(numericSubProblemId)
        ? problemSlotIds[numericSubProblemId]
        : undefined;
      return {
        subProblemId: renderedSubProblemId ?? a.subProblemId,
        answer: a.answer,
        graded: a.graded,
      };
    });
    return { [primary.questionId]: { problemId: primary.questionId, responses } };
  }, [answers, primary.questionId, problemSlotIds]);

  return (
    <Box>
      {reviewerCount > 0 ? (
        <FormControl fullWidth size="small" sx={answerDisplayStyles.reviewerSelect}>
          <InputLabel id={`reviewer-select-${primary.id}`}>Reviewer</InputLabel>
          <Select
            labelId={`reviewer-select-${primary.id}`}
            label="Reviewer"
            value={safeReviewerIdx}
            onChange={(e) => setReviewerIdx(Number(e.target.value))}
          >
            {reviewerOptions.map((label, i) => (
              <MenuItem key={i} value={i}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}
      <AnswerContext.Provider value={answerContext}>
        {problem && (
        <ProblemDisplay
          key={`${primary.questionId}-${feedbackRevision}`}
          showPoints={true}
          problem={problem}
          isFrozen={true}
          r={answerText}
          uri={primary.questionId}
          renderBelowAnswerAccepter={(problemId, isSubProblem) => (
            <AnswerFeedback problemId={problemId} isSubProblem={isSubProblem} />
          )}
        ></ProblemDisplay>
        )}
      </AnswerContext.Provider>
    </Box>
  );
}
function getSelectedAnswerItems(answerItems: AnswerResponse[], params: SortAndFilterParams) {
  function getValue(item: AnswerResponse, field: SortField) {
    if (field === 'courseId') return item.courseId;
    if (field === 'questionTitle') return item.questionTitle;
    if (field === 'courseInstance') return item.courseInstance;
    if (field === 'updatedAt') return item.updatedAt;
  }
  return answerItems
    .filter((item) => {
      for (const field of MULTI_SELECT_FIELDS) {
        if (
          params.multiSelectField[field].length > 0 &&
          !params.multiSelectField[field].includes(item[field])
        ) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      for (const f of params.sortingFields) {
        const order = params.sortOrders[f] === 'ASC' ? 1 : -1;
        const aVal = getValue(a, f);
        const bVal = getValue(b, f);
        if (aVal < bVal || (!aVal && bVal)) return -1 * order;
        if (aVal > bVal || (aVal && !bVal)) return 1 * order;
      }
      return 0;
    });
}
function AnswerItemsList({
  onSelectItem,
  selectedQuestionId,
  groups,
}: {
  groups: AnswerGroup[];
  onSelectItem: (questionId: string) => void;
  selectedQuestionId?: string;
}) {
  return (
    <Box sx={answerListStyles.root}>
      <List disablePadding>
        {groups.map((group, idx) => (
          <ListItemButton
            key={group.questionId}
            selected={selectedQuestionId === group.questionId}
            onClick={() => onSelectItem(group.questionId)}
            sx={[
              answerListStyles.item,
              selectedQuestionId === group.questionId && answerListStyles.selectedItem,
            ]}
          >
            <ListItemText
              sx={answerListStyles.itemText}
              primary={
                <Box>
                  <Typography variant="subtitle2">
                    {getProblemLabel(group.questionId, idx)}
                  </Typography>
                  {group.questionTitle ? (
                    <Typography variant="body2" component="div" sx={answerListStyles.questionTitle}>
                      <SafeHtml html={group.questionTitle} />
                    </Typography>
                  ) : null}
                </Box>
              }
              secondary={
                <Box sx={answerListStyles.meta}>
                  {group.answers.length > 1 ? (
                    <Chip size="small" label={`${group.answers.length} sub-problems`} />
                  ) : null}
                  <Chip size="small" label={group.courseInstance} />
                  <Chip size="small" label={group.courseId} />
                </Box>
              }
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
function AnswerListSortFields({
  sortAndFilterParams,
  setSortAndFilterParams,
}: {
  sortAndFilterParams: SortAndFilterParams;
  setSortAndFilterParams: Dispatch<SetStateAction<SortAndFilterParams>>;
}) {
  const { sortingFields, sortOrders } = sortAndFilterParams;
  return (
    <Box sx={answerSortStyles.root}>
      <Typography variant="body2" sx={answerSortStyles.label}>
        Sort
      </Typography>
      {sortingFields.map((item) => (
        <Button
          key={item}
          variant="outlined"
          onClick={(e) => {
            e.stopPropagation();
            setSortAndFilterParams((prev) => ({
              ...prev,
              sortingFields: [item, ...prev.sortingFields.filter((f) => f !== item)],
            }));
          }}
          sx={answerSortStyles.button}
        >
          {item}&nbsp;
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();

              setSortAndFilterParams((prev) => ({
                ...prev,
                sortOrders: {
                  ...prev.sortOrders,
                  [item]: sortOrders[item] === 'ASC' ? 'DESC' : 'ASC',
                },
              }));
            }}
          >
            {sortOrders[item] === 'ASC' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
          </IconButton>
        </Button>
      ))}
      <IconButton
        size="small"
        onClick={() => {
          setSortAndFilterParams((prev) => ({
            ...prev,
            sortingFields: [...ALL_SORT_FIELDS],
            sortOrders: DEFAULT_SORT_ORDER,
          }));
        }}
      >
        <SettingsBackupRestore />
      </IconButton>
    </Box>
  );
}
const MyAnswersPage: NextPage = () => {
  const [answerItems, setAnswerItems] = useState<AnswerResponse[]>([]);
  const [sortAndFilterParams, setSortAndFilterParams] = useState<SortAndFilterParams>({
    multiSelectField: {
      courseId: [],
      questionId: [],
      courseInstance: [],
    },
    sortingFields: [...ALL_SORT_FIELDS],
    sortOrders: DEFAULT_SORT_ORDER,
  });
  const [selected, setSelected] = useState<{ questionId: string } | undefined>(undefined);
  const { user, isUserLoading } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    getMyAnswers().then((answers) => setAnswerItems(answers));
  }, [router, user, isUserLoading]);
  const selectedAnswersItems = useMemo(
    () => getSelectedAnswerItems(answerItems, sortAndFilterParams),
    [answerItems, sortAndFilterParams]
  );

  const groupedAnswers = useMemo(
    () => groupAnswersByQuestion(selectedAnswersItems),
    [selectedAnswersItems]
  );
  // const onDelete = (id: number) => {
  //   if (confirm('Are you sure you want to delete this answer?')) {
  //     const institutionId = router.query.institutionId as string;
  //     deleteAnswer(id, institutionId).then(() => {
  //       getMyAnswers().then((answers) => {
  //         setAnswerItems(answers);
  //       });
  //       setSelected(undefined);
  //       alert('Answer Deleted');
  //     });
  //   }
  // };
  return (
    <MainLayout title={`${user?.fullName} | ALeA`}>
      {answerItems.length === 0 && <Typography>No Answer Items Found.</Typography>}
      <AnswerItemOrganizer
        answerItems={answerItems}
        sortAndFilterParams={sortAndFilterParams}
        setSortAndFilterParams={setSortAndFilterParams}
      />

      <Box sx={pageStyles.header}>
        <Typography variant="h6">My answers</Typography>
        <Chip color="primary" variant="outlined" label={`${groupedAnswers.length} questions`} />
      </Box>
      <Box sx={pageStyles.content}>
        <Box sx={pageStyles.sidebar}>
          <Box sx={pageStyles.sidebarHeader}>
            <Typography variant="subtitle2">Questions</Typography>
          </Box>
          <Divider />
          <AnswerItemsList
            groups={groupedAnswers}
            selectedQuestionId={selected?.questionId}
            onSelectItem={(questionId) => setSelected({ questionId })}
          />
        </Box>
        <Box sx={pageStyles.details}>
          {selected ? (
            (() => {
              const selectedGroup = groupedAnswers.find(
                (g) => g.questionId === selected.questionId
              );
              return selectedGroup ? (
                <AnswerItemDisplay answers={selectedGroup.answers} />
              ) : (
                <Typography color="text.secondary">Selected question not found.</Typography>
              );
            })()
          ) : (
            <Typography color="text.secondary">Select a question to view your answer.</Typography>
          )}
        </Box>
      </Box>
    </MainLayout>
  );
};

const answerOrganizerStyles = {
  root: {
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
    p: 2,
    mb: 1.5,
    bgcolor: 'background.paper',
  },
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 2,
  },
} as const;

const answerDisplayStyles = {
  emptyFeedback: {
    mt: 1.5,
    p: 2,
    color: 'text.secondary',
    bgcolor: 'background.default',
  },
  reviewerSelect: {
    mb: 1,
  },
  feedbackSummary: {
    mt: 1.5,
    p: 1.25,
    borderRadius: 1,
    border: 1,
    borderColor: '#c8e6c9',
    bgcolor: '#f6fbf6',
  },
  feedbackMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    mb: 1,
  },
  feedbackLabel: {
    fontWeight: 700,
    color: '#2e7d32',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  scorePill: {
    px: 1,
    py: 0.25,
    borderRadius: 999,
    color: '#1b5e20',
    bgcolor: '#dff3e3',
    fontWeight: 700,
  },
  feedbackNotes: {
    display: 'grid',
    gap: 0.5,
  },
  feedbackText: {
    color: 'text.primary',
    whiteSpace: 'pre-wrap',
  },
} as const;

const answerListStyles = {
  root: {
    maxHeight: '65vh',
    overflow: 'auto',
  },
  item: {
    alignItems: 'flex-start',
    py: 1.25,
    px: 1.5,
    borderBottom: 1,
    borderColor: 'divider',
    bgcolor: 'background.paper',
  },
  selectedItem: {
    bgcolor: 'action.selected',
    borderLeft: 3,
    borderLeftColor: 'primary.main',
    pl: 1.125,
    '&:hover': {
      bgcolor: 'action.hover',
    },
  },
  itemText: {
    my: 0,
  },
  questionTitle: {
    color: 'text.secondary',
    mt: 0.25,
  },
  meta: {
    mt: 0.75,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 0.5,
  },
} as const;

const answerSortStyles = {
  root: {
    display: 'flex',
    rowGap: 1,
    columnGap: 1,
    alignItems: 'center',
    flexWrap: 'wrap',
    mt: 1.5,
  },
  label: {
    color: 'text.secondary',
    mr: 0.5,
  },
  button: {
    py: 0.25,
  },
} as const;

const pageStyles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    mb: 1,
  },
  content: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 2,
    alignItems: 'stretch',
  },
  sidebar: {
    flexGrow: { xs: 1, md: 0 },
    flexShrink: 0,
    width: { xs: '100%', md: 320 },
    maxWidth: { xs: '100%', md: 320 },
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
    overflow: 'hidden',
    bgcolor: 'background.paper',
  },
  sidebarHeader: {
    px: 1.5,
    py: 1,
    bgcolor: 'grey.50',
  },
  details: {
    flexGrow: 1,
    flexBasis: { xs: '100%', md: 0 },
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
    p: 2,
    bgcolor: 'background.paper',
    minWidth: 0,
  },
} as const;

export default MyAnswersPage;
