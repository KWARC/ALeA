import { FTML } from '@flexiformal/ftml';
import { SettingsBackupRestore } from '@mui/icons-material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import {
  Box,
  Button,
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
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
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
    <Box>
      <Box display="flex" flexWrap="wrap" gap={2}>
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
  const [reviewerIdxByAnswerId, setReviewerIdxByAnswerId] = useState<Record<number, number>>({});

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
        setReviewerIdxByAnswerId({});
      } catch {
        if (isMounted) {
          setProblem(undefined);
          setAnswerText(undefined);
          setGradingsByAnswerId({});
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [primary.questionId, answers]);

  return (
    <Box>
      <ProblemDisplay
        showPoints={true}
        problem={problem}
        isFrozen={true}
        r={answerText}
        uri={primary.questionId}
      ></ProblemDisplay>

      <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>
        Feedback received
      </Typography>
      {answers.map((a) => {
        const gradings = sortGradingsForAnonymousOrder(gradingsByAnswerId[a.id] ?? []);
        const idx = reviewerIdxByAnswerId[a.id] ?? 0;
        const safeIdx = Math.min(idx, Math.max(0, gradings.length - 1));
        const selectedGrading = gradings.length > 0 ? gradings[safeIdx] : undefined;
        const summary = selectedGrading ? summarizeGradingForStudentView(selectedGrading) : null;
        const subLabel = Number.isFinite(Number(a.subProblemId))
          ? `Sub-problem ${Number(a.subProblemId) + 1}`
          : `Sub-problem ${a.subProblemId}`;

        return (
          <Box key={a.id} sx={{ mt: 1.5 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                {answers.length > 1 ? subLabel : `Answered ${dayjs(a.updatedAt).fromNow()}`}
              </Typography>
            </Box>
            {gradings.length === 0 ? (
              <Box
                sx={{ border: '1px solid #ccc', borderRadius: 2, p: 2, color: 'text.secondary' }}
              >
                No feedback received yet for this submission.
              </Box>
            ) : (
              <Box sx={{ border: '1px solid #ccc', borderRadius: 2, p: 1 }}>
                <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                  <InputLabel id={`reviewer-select-${a.id}`}>Reviewer</InputLabel>
                  <Select
                    labelId={`reviewer-select-${a.id}`}
                    label="Reviewer"
                    value={safeIdx}
                    onChange={(e) =>
                      setReviewerIdxByAnswerId((prev) => ({
                        ...prev,
                        [a.id]: Number(e.target.value),
                      }))
                    }
                  >
                    {gradings.map((_, i) => (
                      <MenuItem key={i} value={i}>
                        Reviewer {i + 1}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {selectedGrading && summary ? (
                  <Box sx={{ pt: 0.5, px: 0.5 }}>
                    <Typography variant="body2" component="div">
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        Feedback
                      </Box>
                      {' - '}
                      {summary.labels.length > 0 ? summary.labels.join(', ') : '-'}
                    </Typography>
                    {summary.notes ? (
                      <Typography variant="body2" sx={{ pl: 5, pt: 0.75, whiteSpace: 'pre-wrap' }}>
                        {summary.notes}
                      </Typography>
                    ) : null}
                  </Box>
                ) : null}
              </Box>
            )}
          </Box>
        );
      })}
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
  groups,
}: {
  groups: AnswerGroup[];
  onSelectItem: (questionId: string) => void;
}) {
  return (
    <Box maxHeight="50vh" overflow="scroll">
      <List disablePadding>
        {groups.map((group, idx) => (
          <ListItemButton
            key={group.questionId}
            onClick={() => onSelectItem(group.questionId)}
            sx={{ py: 0, bgcolor: idx % 2 === 0 ? 'grey.100' : 'background.paper' }}
          >
            <ListItemText
              primary={
                group.questionTitle ? <SafeHtml html={group.questionTitle} /> : group.questionId
              }
              secondary={
                <Box>
                  <Box>
                    <span>Sub-problems answered: </span>
                    <span>{group.answers.length}</span>
                  </Box>
                  <Box>
                    <span>Last answered: </span>
                    <span>{dayjs(group.latestUpdatedAt).fromNow()}</span>
                  </Box>
                  <Box>
                    <span>Semester: </span>
                    <span>{group.courseInstance}</span>
                  </Box>
                  <Box>
                    <span>Course: </span>
                    <span>{group.courseId}</span>
                  </Box>
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
    <Box display="flex" rowGap={1} columnGap={2} alignItems="center" flexWrap="wrap">
      Sort:
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
          sx={{ py: 0 }}
        >
          {item}&nbsp;
          <IconButton
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
  dayjs.extend(relativeTime);
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

      <Typography sx={{ fontStyle: 'italic' }}>
        <b style={{ color: 'red' }}>{groupedAnswers.length}</b> Question Items Selected.
      </Typography>
      <Box display="flex" mt={1} flexWrap="wrap" rowGap={0.5}>
        <Box sx={{ border: '1px solid #ccc' }} flex="1 1 200px" maxWidth={300}>
          <AnswerItemsList
            groups={groupedAnswers}
            onSelectItem={(questionId) => setSelected({ questionId })}
          />
        </Box>
        <Box border="1px solid #ccc" flex="1 1 400px" p={2} maxWidth="fill-available">
          {selected ? (
            (() => {
              const selectedGroup = groupedAnswers.find(
                (g) => g.questionId === selected.questionId
              );
              return selectedGroup ? (
                <AnswerItemDisplay answers={selectedGroup.answers} />
              ) : (
                <i>Selected question not found.</i>
              );
            })()
          ) : (
            <i>Please click on a question on the left.</i>
          )}
        </Box>
      </Box>
    </MainLayout>
  );
};
export default MyAnswersPage;
