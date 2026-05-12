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
  GradingAnswerClass,
  GradingInfo,
} from '@alea/spec';
import { SafeHtml, useCurrentUser } from '@alea/react-utils';
import { ProblemDisplay } from '@alea/stex-react-renderer';
import { contentFragment } from '@flexiformal/ftml-backend';
import { parseContentFragmentTuple } from '@alea/quiz-utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { MultiItemSelector } from '../components/nap/MultiItemsSelector';
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
    const ta = new Date(a.updatedAt).getTime();
    const tb = new Date(b.updatedAt).getTime();
    if (ta !== tb) return ta - tb;
    return a.id - b.id;
  });
}

function plainTextFromRichLabel(s: string) {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function summarizeGradingForStudentView(grading: GradingInfo): { labels: string[]; notes: string } {
  const rows = grading.answerClasses ?? [];
  const seen = new Set<string>();
  const labels: string[] = [];

  function pushDistinct(row: GradingAnswerClass) {
    if (!row.count || row.count <= 0) return;
    const t = plainTextFromRichLabel(
      String(row.title || row.description || row.answerClassId).trim()
    );
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    labels.push(t);
  }

  for (const row of rows) if (row.isTrait) pushDistinct(row);
  if (labels.length === 0) for (const row of rows) if (!row.isTrait) pushDistinct(row);

  return {
    labels,
    notes: String(grading.customFeedback ?? '').trim(),
  };
}

function getSubProblemLabel(subProblemId: string | number | null | undefined) {
  const raw = String(subProblemId ?? '').trim();
  const numericId = Number(raw);
  if (Number.isFinite(numericId)) return `Sub-problem ${numericId + 1}`;
  return `Sub-problem ${raw}`;
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
  const [subProblemsByAnswerId, setSubProblemsByAnswerId] = useState<
    Record<number, { titleHtml: string; html: string }>
  >({});
  const [gradingsByAnswerId, setGradingsByAnswerId] = useState<Record<number, GradingInfo[]>>({});
  const [reviewerIdx, setReviewerIdx] = useState(0);
  const [problemSlotIds, setProblemSlotIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const raw = await contentFragment({ uri: primary.questionId });
        if (!isMounted) return;
        const { titleHtml, html } = parseContentFragmentTuple(raw);
        setProblem({
          problem: {
            uri: primary.questionId,
            html,
            title_html: titleHtml,
          },
          answerClasses: [],
        });
        const responses = [] as FTML.ProblemResponse['responses'];
        for (const a of answers) {
          const idx = Number(a.subProblemId);
          if (Number.isFinite(idx)) {
            responses[idx] = {
              type: 'Fillinsol',
              value: a.answer,
            };
          }
        }
        setAnswerText({
          uri: primary.questionId,
          responses,
        });

        const subProblems: Record<number, { titleHtml: string; html: string }> = {};
        for (const a of answers) {
          const subProblemId = String(a.subProblemId ?? '').trim();
          if (!/^https?:\/\//i.test(subProblemId)) continue;
          try {
            subProblems[a.id] = parseContentFragmentTuple(
              await contentFragment({ uri: subProblemId })
            );
          } catch {
            // Keep the label fallback when a sub-problem fragment is unavailable.
          }
        }
        if (!isMounted) return;
        setSubProblemsByAnswerId(subProblems);

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
          setSubProblemsByAnswerId({});
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
    if (!isSubProblem && answers.length === 1 && problemSlotIds.length === 0) return answers[0];
    const direct = answers.find((a) => String(a.subProblemId ?? '').trim() === problemId);
    if (direct) return direct;
    const byRenderedIndex = answers.find((a) => {
      const idx = Number(a.subProblemId);
      return Number.isFinite(idx) && problemSlotIds[idx] === problemId;
    });
    if (byRenderedIndex) return byRenderedIndex;
    const idx = problemSlotIds.indexOf(problemId);
    if (isSubProblem && idx >= 0 && answers.length === problemSlotIds.length) return answers[idx];
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
      setProblemSlotIds((prev) => (prev.includes(problemId) ? prev : [...prev, problemId]));
    }, [problemId, isSubProblem]);

    if (!isSubProblem && problemSlotIds.length > 0) return null;
    const a = findAnswerForProblem(problemId, isSubProblem);
    if (!a) return null;

    const gradings = sortGradingsForAnonymousOrder(gradingsByAnswerId[a.id] ?? []);
    const safeIdx = Math.min(reviewerIdx, Math.max(0, gradings.length - 1));
    const selectedGrading = gradings.length > 0 ? gradings[safeIdx] : undefined;
    const summary = selectedGrading ? summarizeGradingForStudentView(selectedGrading) : null;
    const subLabel = getSubProblemLabel(a.subProblemId);
    const subProblem = subProblemsByAnswerId[a.id];

    return (
      <Box sx={answerDisplayStyles.feedbackCard}>
        <Box sx={answerDisplayStyles.feedbackHeader}>
          <Typography variant="subtitle2">
            {answers.length > 1 ? (subProblem ? 'Sub-problem' : subLabel) : 'Answered'}
          </Typography>
          {answers.length > 1 && subProblem ? (
            <Box sx={answerDisplayStyles.subProblemContent}>
              <SafeHtml html={subProblem.html || subProblem.titleHtml} />
            </Box>
          ) : null}
        </Box>
        {gradings.length === 0 ? (
          <Box sx={answerDisplayStyles.emptyFeedback}>
            No feedback received yet for this submission.
          </Box>
        ) : (
          <Box sx={answerDisplayStyles.feedbackBody}>
            {selectedGrading ? (
              <Box sx={answerDisplayStyles.feedbackSummary}>
                <Typography variant="subtitle2">Score: {selectedGrading.totalPoints}</Typography>
                {summary?.notes ? (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 1 }}>
                      Feedback
                    </Typography>
                    <Typography variant="body2" sx={answerDisplayStyles.feedbackNotes}>
                      {summary.notes}
                    </Typography>
                  </>
                ) : null}
              </Box>
            ) : null}
          </Box>
        )}
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
            {Array.from({ length: reviewerCount }, (_, i) => (
              <MenuItem key={i} value={i}>
                Reviewer {i + 1}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}
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
  feedbackTitle: {
    mt: 2,
    mb: 1,
  },
  feedbackCard: {
    mt: 1.5,
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
    overflow: 'hidden',
    bgcolor: 'background.paper',
  },
  feedbackHeader: {
    p: 1.5,
    bgcolor: 'grey.50',
    borderBottom: 1,
    borderColor: 'divider',
  },
  subProblemContent: {
    mt: 1,
  },
  emptyFeedback: {
    p: 2,
    color: 'text.secondary',
    bgcolor: 'background.default',
  },
  feedbackBody: {
    p: 1.5,
  },
  reviewerSelect: {
    mb: 1,
  },
  feedbackSummary: {
    p: 1.5,
    borderRadius: 1,
    bgcolor: 'grey.50',
  },
  feedbackNotes: {
    mt: 0.5,
    p: 1,
    borderLeft: 3,
    borderColor: 'primary.main',
    borderRadius: 0.5,
    color: 'text.primary',
    bgcolor: 'background.paper',
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
