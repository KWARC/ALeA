import { SafeHtml } from '@alea/react-utils';
import {
  AnswerClass,
  CreateAnswerClassRequest,
  createGrading,
  FTMLProblemWithSolution,
  getAnswerAdmin,
  getCourseAcls,
  getCourseGradingItems,
  getMyGradingForAnswer,
  getNextGradingItem,
  GradingInfo,
  GradingItem,
  HomeworkInfo,
  isUserMember,
  ResponseWithSubProblemId,
  Tristate,
} from '@alea/spec';
import { AnswerContext, GradingCreator, ProblemDisplay } from '@alea/stex-react-renderer';
import {
  answerClassesFromLooseGradingNotesPayload,
  gradingNotesRequestUriFromSubProblemId,
  mergeAnswerClassesByClassName,
  normalizeProblemId,
  parseContentFragmentTuple,
} from '@alea/quiz-utils';
import { CURRENT_TERM, getParamFromUri } from '@alea/utils';
import { contentFragment, gradingNotes } from '@flexiformal/ftml-backend';
import { SettingsBackupRestore } from '@mui/icons-material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import ShieldIcon from '@mui/icons-material/Shield';
import {
  Button,
  FormControlLabel,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Switch,
  CircularProgress,
  Tooltip,
  Typography,
} from '@mui/material';
import Box from '@mui/material/Box';
import {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MultiItemSelector } from './MultiItemsSelector';

const TIMED_SKIP_DURATION_MS = 24 * 60 * 60 * 1000;

interface TimedSkipEntry {
  answerId: number;
  expiresAt: number;
}

function getTimedSkipKey(courseId: string) {
  return `peer-grading-skip:${courseId}`;
}

function getAlwaysSkipKey(courseId: string) {
  return `peer-grading-always-skip:${courseId}`;
}

function readTimedSkips(courseId: string): number[] {
  try {
    const raw = localStorage.getItem(getTimedSkipKey(courseId));
    if (!raw) return [];
    const entries: TimedSkipEntry[] = JSON.parse(raw);
    const now = Date.now();
    const valid = entries.filter((e) => e.expiresAt > now);
    localStorage.setItem(getTimedSkipKey(courseId), JSON.stringify(valid));
    return valid.map((e) => e.answerId);
  } catch {
    return [];
  }
}

function addTimedSkip(courseId: string, answerId: number) {
  try {
    const raw = localStorage.getItem(getTimedSkipKey(courseId));
    const entries: TimedSkipEntry[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const cleaned = entries.filter((e) => e.expiresAt > now && e.answerId !== answerId);
    cleaned.push({ answerId, expiresAt: now + TIMED_SKIP_DURATION_MS });
    localStorage.setItem(getTimedSkipKey(courseId), JSON.stringify(cleaned));
  } catch {
    // ignore
  }
}

function readAlwaysSkips(courseId: string): number[] {
  try {
    const raw = localStorage.getItem(getAlwaysSkipKey(courseId));
    if (!raw) return [];
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

function addAlwaysSkip(courseId: string, answerId: number) {
  try {
    const existing = readAlwaysSkips(courseId);
    const updated = Array.from(new Set([...existing, answerId]));
    localStorage.setItem(getAlwaysSkipKey(courseId), JSON.stringify(updated));
  } catch {
    // ignore
  }
}

const MULTI_SELECT_FIELDS = ['homeworkId', 'questionId', 'studentId'] as const;
const ALL_SORT_FIELDS = ['homeworkDate', 'questionTitle', 'updatedAt', 'studentId'] as const;
const DEFAULT_SORT_ORDER: Record<SortField, 'ASC' | 'DESC'> = {
  homeworkDate: 'DESC',
  questionTitle: 'ASC',
  studentId: 'ASC',
  updatedAt: 'ASC',
};
type MultSelectField = (typeof MULTI_SELECT_FIELDS)[number];
type SortField = (typeof ALL_SORT_FIELDS)[number];

function getMappedProblem(
  questionMap: Record<string, FTMLProblemWithSolution>,
  questionId: string
) {
  return questionMap[questionId] ?? questionMap[getParamFromUri(questionId, 'a') ?? questionId];
}

function getQuestionTitle(
  questionMap: Record<string, FTMLProblemWithSolution>,
  questionId: string
) {
  return (
    getMappedProblem(questionMap, questionId)?.problem?.title_html ??
    getParamFromUri(questionId, 'd')?.replace(/[-_+]/g, ' ') ??
    questionId
  );
}

function getSelectedGradingItems(
  items: GradingItem[],
  params: SortAndFilterParams,
  homeworkMap: Record<string, HomeworkInfo>,
  questionMap: Record<string, FTMLProblemWithSolution>
) {
  function getValue(item: GradingItem, field: SortField) {
    if (field === 'homeworkDate') return homeworkMap[item.homeworkId]?.givenTs;
    if (field === 'questionTitle') return getQuestionTitle(questionMap, item.questionId);
    if (field === 'studentId') return item.studentId;
    if (field === 'updatedAt') return item.updatedAt;
  }
  return items
    .filter((item) => {
      if (params.showHomeworkOnly && !item.homeworkId) return false;
      if (params.showPracticeOnly && item.homeworkId) return false;
      for (const field of MULTI_SELECT_FIELDS) {
        if (
          params.multiSelectField[field].length > 0 &&
          !params.multiSelectField[field].includes(item[field])
        ) {
          return false;
        }
      }
      if (params.isGraded !== Tristate.UNKNOWN) {
        const isGraded = item.numSubProblemsGraded === item.numSubProblemsAnswered;
        const wantGraded = params.isGraded === Tristate.TRUE;
        if (isGraded !== wantGraded) return false;
      }
      if (params.isInstructorGraded !== Tristate.UNKNOWN) {
        const isGraded = item.numSubProblemsInstructorGraded === item.numSubProblemsAnswered;
        const wantGraded = params.isInstructorGraded === Tristate.TRUE;
        if (isGraded !== wantGraded) return false;
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

function GradingListSortFields({
  sortAndFilterParams,
  setSortAndFilterParams,
  isPeerGrading,
}: {
  sortAndFilterParams: SortAndFilterParams;
  isPeerGrading: boolean;
  setSortAndFilterParams: Dispatch<SetStateAction<SortAndFilterParams>>;
}) {
  const { sortingFields, sortOrders } = sortAndFilterParams;
  return (
    <Box display="flex" rowGap={1} columnGap={2} alignItems="center" flexWrap="wrap">
      Sort:
      {sortingFields
        .filter((i) => (isPeerGrading ? i !== 'studentId' : i))
        .map((item) => (
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

function GradingItemOrganizer({
  gradingItems,
  questionMap,
  homeworkMap,
  sortAndFilterParams,
  isPeerGrading,
  setSortAndFilterParams,
}: {
  gradingItems: GradingItem[];
  questionMap: Record<string, FTMLProblemWithSolution>;
  homeworkMap: Record<string, HomeworkInfo>;
  sortAndFilterParams: SortAndFilterParams;
  isPeerGrading: boolean;
  setSortAndFilterParams: Dispatch<SetStateAction<SortAndFilterParams>>;
}) {
  const allQuestions = useMemo(
    () =>
      Object.entries(questionMap).map(([id, p]) => ({
        value: id,
        title: p.problem.title_html,
      })),
    [questionMap]
  );
  const allHomeworks = useMemo(
    () => Object.values(homeworkMap).map((hw) => ({ value: hw.id, title: hw.title })),
    [homeworkMap]
  );
  const allStudentIds = useMemo(() => {
    const uniqueIds = [...new Set(gradingItems.map((gi) => gi.studentId))];
    return uniqueIds.map((id) => ({ value: id, title: id }));
  }, [gradingItems]);
  return (
    <Box>
      <Box display="flex" flexWrap="wrap" gap={2}>
        <MultiItemSelector
          label="Homeworks"
          selectedValues={sortAndFilterParams.multiSelectField.homeworkId}
          allValues={allHomeworks}
          onUpdate={(homeworkId) =>
            setSortAndFilterParams((prev) => ({
              ...prev,
              multiSelectField: { ...prev.multiSelectField, homeworkId },
            }))
          }
        />
        <MultiItemSelector
          label="Questions"
          selectedValues={sortAndFilterParams.multiSelectField.questionId}
          allValues={allQuestions}
          onUpdate={(questionId) =>
            setSortAndFilterParams((prev) => ({
              ...prev,
              multiSelectField: { ...prev.multiSelectField, questionId },
            }))
          }
        />
        {!isPeerGrading && (
          <MultiItemSelector
            label="Students"
            selectedValues={sortAndFilterParams.multiSelectField.studentId}
            allValues={allStudentIds}
            onUpdate={(studentId) =>
              setSortAndFilterParams((prev) => ({
                ...prev,
                multiSelectField: { ...prev.multiSelectField, studentId },
              }))
            }
          />
        )}
      </Box>
      <Box my={1}>
        <Button
          variant="contained"
          onClick={() =>
            setSortAndFilterParams({
              ...sortAndFilterParams,
              isInstructorGraded:
                sortAndFilterParams.isInstructorGraded === Tristate.FALSE
                  ? Tristate.UNKNOWN
                  : Tristate.FALSE,
            })
          }
        >
          {sortAndFilterParams.isInstructorGraded === Tristate.FALSE
            ? 'Show all problems'
            : 'Show ungraded problems only'}
        </Button>
      </Box>
      <GradingListSortFields
        isPeerGrading={isPeerGrading}
        sortAndFilterParams={sortAndFilterParams}
        setSortAndFilterParams={setSortAndFilterParams}
      />
    </Box>
  );
}

function GradingItemsList({
  gradingItems,
  onSelectItem,
  homeworkMap,
  isPeerGrading,
}: {
  gradingItems: GradingItem[];
  onSelectItem: (
    homeworkId: number,
    problemId: string,
    studentId: string,
    answerId: number
  ) => void;
  homeworkMap: Record<string, HomeworkInfo>;
  isPeerGrading: boolean;
}) {
  return (
    <Box maxHeight="50vh" overflow="scroll">
      <List disablePadding>
        {gradingItems.map(
          (
            {
              homeworkId,
              questionId,
              studentId,
              answerId,
              numSubProblemsAnswered,
              numSubProblemsInstructorGraded,
            },
            idx
          ) => (
            <ListItemButton
              key={`${homeworkId}-${questionId}-${studentId}`}
              onClick={(e) => onSelectItem(homeworkId, questionId, studentId, answerId)}
              sx={{ py: 0, bgcolor: idx % 2 === 0 ? '#f0f0f0' : 'background.paper' }}
            >
              <ListItemIcon>
                {numSubProblemsInstructorGraded === numSubProblemsAnswered ? (
                  <ShieldIcon htmlColor="green" />
                ) : (
                  <CheckBoxOutlineBlankIcon />
                )}
              </ListItemIcon>
              <ListItemText
                primary={!isPeerGrading ? `Problem ${idx + 1}` : 'Problem'}
                secondary={
                  <>
                    {!homeworkId ? (
                      'Not Homework'
                    ) : homeworkMap[homeworkId]?.title ? (
                      <SafeHtml html={homeworkMap[homeworkId].title} />
                    ) : (
                      'HW ' + homeworkId
                    )}
                    &nbsp;{isPeerGrading ? '' : `(${studentId})`}
                  </>
                }
              />
            </ListItemButton>
          )
        )}
      </List>
    </Box>
  );
}

interface EmbeddedGradingFormState {
  answerId: number;
  rootAnswerClasses: AnswerClass[] | undefined;
  classesBySubProblemId: Record<string, AnswerClass[]>;
  subProblemIds: Set<string>;
  registerSubProblem: (id: string) => void;
  hasAnswerForSubProblem: (id: string) => boolean;
  myGrading: GradingInfo | null | undefined;
  myGradingByProblemId: Record<string, GradingInfo | null>;
  onSubmit: (
    problemId: string,
    isSubProblem: boolean,
    acs: CreateAnswerClassRequest[],
    feedback: string
  ) => Promise<void>;
}

const EmbeddedGradingFormContext = createContext<EmbeddedGradingFormState | null>(null);

function EmbeddedGradingForm({
  problemId,
  isSubProblem,
}: {
  problemId: string;
  isSubProblem: boolean;
}) {
  const ctx = useContext(EmbeddedGradingFormContext);
  const register = ctx?.registerSubProblem;
  useEffect(() => {
    if (isSubProblem && register) register(problemId);
  }, [isSubProblem, problemId, register]);

  const handleSubmit = useCallback(
    async (acs: CreateAnswerClassRequest[], feedback: string) => {
      if (!ctx) return;
      await ctx.onSubmit(problemId, isSubProblem, acs, feedback);
    },
    [ctx, problemId, isSubProblem]
  );

  if (!ctx) return null;

  if (!isSubProblem && ctx.subProblemIds.size > 0) return null;
  if (isSubProblem && !ctx.hasAnswerForSubProblem(problemId)) {
    return (
      <Box sx={{ my: 1, p: 1, bgcolor: '#fff8c5', border: '1px solid #e0c94f', borderRadius: 1 }}>
        No need to give feedback as user have not solved this problem.
      </Box>
    );
  }

  const subProblemClasses = isSubProblem
    ? ctx.classesBySubProblemId[problemId] ??
      ctx.classesBySubProblemId[normalizeProblemId(problemId)]
    : undefined;
  // For subproblems, never fall back to combined root classes (would mix all
  // subproblems' classes). Use [] until the per-subproblem entry resolves.
  const classes = isSubProblem
    ? subProblemClasses ?? (Object.keys(ctx.classesBySubProblemId).length === 0 ? undefined : [])
    : ctx.rootAnswerClasses;

  const initialGrading = isSubProblem
    ? ctx.myGradingByProblemId[problemId] ??
      ctx.myGradingByProblemId[normalizeProblemId(problemId)] ??
      null
    : ctx.myGrading ?? null;

  return (
    <GradingProblem
      answerId={ctx.answerId}
      answerClasses={classes ?? []}
      initialGrading={initialGrading}
      gradesReady={classes !== undefined}
      onNewGrading={handleSubmit}
    />
  );
}

function GradingProblem({
  onNewGrading,
  answerClasses,
  answerId,
  initialGrading,
  gradesReady,
}: {
  onNewGrading: (acs: CreateAnswerClassRequest[], feedback: string) => Promise<void>;
  answerClasses: AnswerClass[];
  answerId: number;
  initialGrading: GradingInfo | null;
  gradesReady: boolean;
}) {
  if (!gradesReady) {
    return <CircularProgress size={32} sx={{ display: 'block', my: 2, mx: 'auto' }} />;
  }
  return (
    <Box>
      <GradingCreator
        key={`${answerId}-${initialGrading?.id ?? 'n'}`}
        rawAnswerClasses={answerClasses}
        initialGrading={initialGrading}
        onNewGrading={onNewGrading}
      />
    </Box>
  );
}

function GradingItemDisplay({
  questionId,
  answerId,
  questionMap,
  courseId,
  isPeerGrading,
  onAfterGrading,
  peerResponses,
}: {
  questionId: string;
  answerId: number;
  courseId: string;
  isPeerGrading?: boolean;
  questionMap: Record<string, FTMLProblemWithSolution>;
  onAfterGrading?: () => void | Promise<void>;
  peerResponses?: { answerId?: number; subProblemId: string; answer: string }[];
}) {
  const [studentResponse, setStudentResponse] =
    useState<Record<string, ResponseWithSubProblemId>>();
  const [problem, setProblem] = useState<FTMLProblemWithSolution | undefined>(
    getMappedProblem(questionMap, questionId)
  );
  const [answerClasses, setAnswerClasses] = useState<AnswerClass[]>();
  const [answerClassesBySubProblemId, setAnswerClassesBySubProblemId] = useState<
    Record<string, AnswerClass[]>
  >({});
  const [subProblemIds, setSubProblemIds] = useState<Set<string>>(() => new Set());
  const [gradedSubProblemIds, setGradedSubProblemIds] = useState<Set<string>>(() => new Set());
  const [myGrading, setMyGrading] = useState<GradingInfo | null | undefined>(undefined);
  const [myGradingByProblemId, setMyGradingByProblemId] = useState<
    Record<string, GradingInfo | null>
  >({});

  // Reset detected/graded subproblem ids when switching to a different grading item.
  useEffect(() => {
    setSubProblemIds(new Set());
    setGradedSubProblemIds(new Set());
    setMyGradingByProblemId({});
  }, [questionId, answerId]);

  const registerSubProblem = useCallback((id: string) => {
    setSubProblemIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);
  const hasAnswerForSubProblem = useCallback(
    (id: string) => {
      if (!Array.isArray(peerResponses)) return true;
      const submittedId = String(id ?? '').trim();
      const submittedNorm = normalizeProblemId(submittedId);
      if (
        peerResponses.some((pr) => {
          const dbId = String(pr.subProblemId ?? '').trim();
          return dbId === submittedId || normalizeProblemId(dbId) === submittedNorm;
        })
      ) {
        return true;
      }
      const renderedIds = Array.from(subProblemIds);
      return (
        peerResponses.length === renderedIds.length &&
        renderedIds.some((rid) => rid === submittedId || normalizeProblemId(rid) === submittedNorm)
      );
    },
    [peerResponses, subProblemIds]
  );

  const loadMyGrading = useCallback(() => {
    getMyGradingForAnswer(answerId)
      .then(setMyGrading)
      .catch(() => setMyGrading(null));

    // Load gradings for each subproblem's own answer row (peer grading
    // submits each subproblem against its own answerId).
    if (Array.isArray(peerResponses) && peerResponses.length > 0) {
      void (async () => {
        const next: Record<string, GradingInfo | null> = {};
        const renderedIds = Array.from(subProblemIds);
        for (const [idx, pr] of peerResponses.entries()) {
          const spId = String(pr.subProblemId ?? '').trim();
          const renderedId =
            peerResponses.length === renderedIds.length ? String(renderedIds[idx] ?? '').trim() : '';
          const targetAnswerId =
            pr.answerId && Number.isFinite(Number(pr.answerId)) ? Number(pr.answerId) : undefined;
          if (!spId || !targetAnswerId) continue;
          try {
            const g = await getMyGradingForAnswer(targetAnswerId);
            next[spId] = g ?? null;
            next[normalizeProblemId(spId)] = g ?? null;
            if (renderedId) {
              next[renderedId] = g ?? null;
              next[normalizeProblemId(renderedId)] = g ?? null;
            }
          } catch {
            next[spId] = null;
            next[normalizeProblemId(spId)] = null;
            if (renderedId) {
              next[renderedId] = null;
              next[normalizeProblemId(renderedId)] = null;
            }
          }
        }
        setMyGradingByProblemId(next);
      })();
    } else {
      setMyGradingByProblemId({});
    }
  }, [answerId, peerResponses, subProblemIds]);

  useEffect(() => {
    setMyGrading(null);
    setMyGradingByProblemId({});
    loadMyGrading();
  }, [loadMyGrading]);

  const refreshGradingInfo = useCallback(() => {
    const lookupKey = getParamFromUri(questionId, 'a') ?? questionId;
    const syncStudentResponses = async (): Promise<string[]> => {
      if (isPeerGrading) {
        const responses = Array.isArray(peerResponses) ? peerResponses : [];
        const mapped: Record<string, ResponseWithSubProblemId> = {};
        mapped[questionId] = { problemId: questionId, responses };
        if (lookupKey !== questionId) {
          mapped[lookupKey] = { problemId: lookupKey, responses };
        }
        setStudentResponse(mapped);
        return [
          ...new Set(responses.map((pr) => String(pr.subProblemId ?? '').trim()).filter(Boolean)),
        ];
      }
      try {
        const c = await getAnswerAdmin(courseId, answerId);
        const responses: { subProblemId: string; answer: string }[] = Array.isArray(c?.responses)
          ? (c.responses as { subProblemId?: string; answer?: string }[]).map((r) => ({
              subProblemId: String(r.subProblemId ?? ''),
              answer: String(r.answer ?? ''),
            }))
          : [{ subProblemId: String(c?.subProblemId ?? ''), answer: String(c?.answer ?? '') }];
        const mapped: Record<string, ResponseWithSubProblemId> = {};
        mapped[questionId] = { problemId: questionId, responses };
        if (lookupKey !== questionId) {
          mapped[lookupKey] = { problemId: lookupKey, responses };
        }
        setStudentResponse(mapped);
        return [
          ...new Set(responses.map((pr) => String(pr.subProblemId ?? '').trim()).filter(Boolean)),
        ];
      } catch {
        setStudentResponse(undefined);
        return [];
      }
    };

    void (async () => {
      try {
        await syncStudentResponses();
        if (!problem) {
          setAnswerClasses([]);
          return;
        }
        const gradingNotesBaseUri = problem.problem?.uri || questionId;

        const subProblems = problem.problem?.subProblems ?? [];
        const renderedSubProblemIds = Array.from(subProblemIds)
          .map((id) => String(id ?? '').trim())
          .filter(Boolean);
        const byProblemId: Record<string, AnswerClass[]> = {};
        let gnotesCombined: AnswerClass[] = [];

        /** Real subproblem id -> `e=`; `null`/`undefined` -> mono (base `questionUri` only). */
        const fetchNotesFor = async (
          subProblemIdForUri: string | null | undefined,
          parseHintId?: string
        ): Promise<AnswerClass[]> => {
          const parseKey = String(parseHintId ?? subProblemIdForUri ?? questionId);
          const gnotesUri = gradingNotesRequestUriFromSubProblemId(
            gradingNotesBaseUri,
            subProblemIdForUri ?? undefined
          );
          let payload = await gradingNotes({ uri: gnotesUri });
          let notes = answerClassesFromLooseGradingNotesPayload(payload, parseKey);
          if (!notes.length && questionId !== gradingNotesBaseUri) {
            const fallbackUri = gradingNotesRequestUriFromSubProblemId(
              questionId,
              subProblemIdForUri ?? undefined
            );
            payload = await gradingNotes({ uri: fallbackUri });
            notes = answerClassesFromLooseGradingNotesPayload(payload, parseKey);
          }
          return notes;
        };

        for (let i = 0; i < subProblems.length; i++) {
          const spId = subProblems[i].id;
          const base = subProblems[i].answerClasses ?? [];
          try {
            const notes = await fetchNotesFor(spId);
            const mergedPerPart = mergeAnswerClassesByClassName(notes, base);
            byProblemId[spId] = mergedPerPart;
            byProblemId[normalizeProblemId(spId)] = mergedPerPart;
            byProblemId[`slot:${i + 1}`] = mergedPerPart;
            gnotesCombined = mergeAnswerClassesByClassName(gnotesCombined, notes);
          } catch {
            byProblemId[spId] = base;
            byProblemId[normalizeProblemId(spId)] = base;
            byProblemId[`slot:${i + 1}`] = base;
          }
        }

        if (subProblems.length === 0) {
          const rootId = problem.problem.uri;
          const rootBase = problem.answerClasses ?? [];
          try {
            const rootNotes = await fetchNotesFor(undefined, rootId);
            const mergedRoot = mergeAnswerClassesByClassName(rootNotes, rootBase);
            byProblemId[rootId] = mergedRoot;
            byProblemId[normalizeProblemId(rootId)] = mergedRoot;
            gnotesCombined = mergeAnswerClassesByClassName(gnotesCombined, rootNotes);
          } catch {
            byProblemId[rootId] = rootBase;
            byProblemId[normalizeProblemId(rootId)] = rootBase;
          }
        }

        for (let i = 0; i < renderedSubProblemIds.length; i++) {
          const spId = renderedSubProblemIds[i];
          if (!spId) continue;
          if (subProblems.some((s) => s.id === spId)) continue;
          try {
            const notes = await fetchNotesFor(spId);
            byProblemId[spId] = notes;
            byProblemId[normalizeProblemId(spId)] = notes;
            byProblemId[`slot:${i + 1}`] = notes;
            gnotesCombined = mergeAnswerClassesByClassName(gnotesCombined, notes);
          } catch {
            // ignore missing note blocks
          }
        }

        // Hard fallback: if nothing was extracted from per-part fetches,
        // read root grading-notes payload directly and take answer_classes.
        if (gnotesCombined.length === 0) {
          try {
            const rootFallbackUri = gradingNotesRequestUriFromSubProblemId(
              gradingNotesBaseUri,
              undefined
            );
            const rootPayload = await gradingNotes({ uri: rootFallbackUri });
            const parsed = answerClassesFromLooseGradingNotesPayload(rootPayload, questionId);
            gnotesCombined = mergeAnswerClassesByClassName(gnotesCombined, parsed);
          } catch {
            // keep base-only fallback
          }
        }

        let baseCombined: AnswerClass[] = mergeAnswerClassesByClassName(
          [],
          problem.answerClasses ?? []
        );
        for (const sub of subProblems) {
          baseCombined = mergeAnswerClassesByClassName(baseCombined, sub.answerClasses ?? []);
        }

        setAnswerClasses(mergeAnswerClassesByClassName(gnotesCombined, baseCombined));
        setAnswerClassesBySubProblemId(byProblemId);
      } catch {
        setAnswerClasses([]);
        setAnswerClassesBySubProblemId({});
      }
    })();
  }, [answerId, courseId, isPeerGrading, peerResponses, problem, questionId, subProblemIds]);

  useEffect(() => {
    refreshGradingInfo();
  }, [refreshGradingInfo]);

  useEffect(() => {
    const mappedProblem = getMappedProblem(questionMap, questionId);
    if (mappedProblem) {
      setProblem(mappedProblem);
      return;
    }
    setProblem(undefined);
    const fetchProblem = async () => {
      try {
        const raw = await contentFragment({ uri: questionId });
        const { titleHtml, html } = parseContentFragmentTuple(raw);
        setProblem({
          problem: { uri: questionId, html, title_html: titleHtml },
          answerClasses: [],
        });
      } catch {
        setProblem(undefined);
      }
    };
    fetchProblem();
  }, [questionId, questionMap]);

  const onSubmitGrading = useCallback(
    async (
      submittedProblemId: string,
      isSubProblem: boolean,
      acs: CreateAnswerClassRequest[],
      feedback: string
    ) => {
      // Resolve the actual answerId for this subproblem so peer-grading saves
      // each subproblem's grading against its own Answer row (not the question's MIN id).
      let targetAnswerId = answerId;
      if (isSubProblem && Array.isArray(peerResponses)) {
        const submittedId = String(submittedProblemId ?? '').trim();
        const submittedNorm = normalizeProblemId(submittedId);
        let match = peerResponses.find((pr) => {
          const dbId = String(pr.subProblemId ?? '').trim();
          return dbId === submittedId || normalizeProblemId(dbId) === submittedNorm;
        });
        const renderedIds = Array.from(subProblemIds);
        if (!match && peerResponses.length === renderedIds.length) {
          const slot = renderedIds.findIndex(
            (id) => id === submittedId || normalizeProblemId(id) === submittedNorm
          );
          match = slot >= 0 ? peerResponses[slot] : undefined;
        }
        if (!match?.answerId || !Number.isFinite(Number(match.answerId))) {
          alert('Could not find the submitted answer row for this subproblem.');
          return;
        }
        targetAnswerId = Number(match.answerId);
      }
      await createGrading({
        answerId: targetAnswerId,
        answerClasses: acs,
        customFeedback: feedback,
      });
      loadMyGrading();
      refreshGradingInfo();

      if (!isSubProblem) {
        await onAfterGrading?.();
        return;
      }

      const newGraded = new Set(gradedSubProblemIds);
      newGraded.add(submittedProblemId);
      setGradedSubProblemIds(newGraded);

      const allKnownSubs = subProblemIds;
      const allGraded =
        allKnownSubs.size > 0 && Array.from(allKnownSubs).every((id) => newGraded.has(id));
      if (allGraded) {
        await onAfterGrading?.();
      }
    },
    [
      answerId,
      peerResponses,
      loadMyGrading,
      refreshGradingInfo,
      onAfterGrading,
      gradedSubProblemIds,
      subProblemIds,
    ]
  );

  const embeddedFormState = useMemo<EmbeddedGradingFormState>(
    () => ({
      answerId,
      rootAnswerClasses: answerClasses,
      classesBySubProblemId: answerClassesBySubProblemId,
      subProblemIds,
      registerSubProblem,
      hasAnswerForSubProblem,
      myGrading,
      myGradingByProblemId,
      onSubmit: onSubmitGrading,
    }),
    [
      answerId,
      answerClasses,
      answerClassesBySubProblemId,
      subProblemIds,
      registerSubProblem,
      hasAnswerForSubProblem,
      myGrading,
      myGradingByProblemId,
      onSubmitGrading,
    ]
  );

  return (
    <Box maxWidth={900}>
      <AnswerContext.Provider value={studentResponse}>
        <EmbeddedGradingFormContext.Provider value={embeddedFormState}>
          <ProblemDisplay
            isFrozen={true}
            problem={problem}
            renderBelowAnswerAccepter={(problemId, isSubProblem) => (
              <EmbeddedGradingForm problemId={problemId} isSubProblem={isSubProblem} />
            )}
          />
        </EmbeddedGradingFormContext.Provider>
      </AnswerContext.Provider>
    </Box>
  );
}

interface SortAndFilterParams {
  multiSelectField: Record<MultSelectField, (string | number)[]>;
  isGraded: Tristate;
  isInstructorGraded: Tristate; //only switches between false and unknown
  sortingFields: SortField[];
  sortOrders: Record<SortField, 'ASC' | 'DESC'>;
  showHomeworkOnly: boolean;
  showPracticeOnly: boolean;
}

export function GradingInterface({
  isPeerGrading,
  courseId,
}: {
  isPeerGrading: boolean;
  courseId: string;
}) {
  const [isInstructorUser, setIsInstructorUser] = useState(false);
  const [roleResolved, setRoleResolved] = useState(false);
  const [isLoadingNextItem, setIsLoadingNextItem] = useState(false);
  const [studentCurrentItem, setStudentCurrentItem] = useState<GradingItem | null>(null);
  const [studentCurrentResponses, setStudentCurrentResponses] = useState<
    { answerId?: number; subProblemId: string; answer: string }[]
  >([]);

  const skippedAnswerIdsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!courseId) return;
    const timed = readTimedSkips(courseId);
    const always = readAlwaysSkips(courseId);
    const merged = Array.from(new Set([...timed, ...always]));
    skippedAnswerIdsRef.current = merged;
  }, [courseId]);

  const [sortAndFilterParams, setSortAndFilterParams] = useState<SortAndFilterParams>({
    multiSelectField: {
      homeworkId: [],
      questionId: [],
      studentId: [],
    },
    isGraded: Tristate.UNKNOWN,
    isInstructorGraded: Tristate.UNKNOWN,
    sortingFields: [...ALL_SORT_FIELDS],
    sortOrders: DEFAULT_SORT_ORDER,
    showHomeworkOnly: !isPeerGrading,
    showPracticeOnly: false,
  });
  const [gradingItems, setGradingItems] = useState<GradingItem[]>([]);
  const homeworkMap = useRef<Record<string, HomeworkInfo>>({});
  const questionMap = useRef<Record<string, FTMLProblemWithSolution>>({});

  const [selected, setSelected] = useState<
    { homeworkId: number; questionId: string; studentId: string; answerId: number } | undefined
  >(undefined);

  const selectedGradedItems = useMemo(
    () =>
      getSelectedGradingItems(
        gradingItems,
        sortAndFilterParams,
        homeworkMap.current,
        questionMap.current
      ),
    [gradingItems, sortAndFilterParams]
  );

  const loadNextStudentItem = useCallback(
    async (skipAnswerId?: number | string) => {
      if (!courseId) return;
      let nextSkippedAnswerIds = skippedAnswerIdsRef.current;
      const parsedSkipAnswerId =
        skipAnswerId !== undefined && skipAnswerId !== null ? Number(skipAnswerId) : undefined;
      if (parsedSkipAnswerId !== undefined && Number.isFinite(parsedSkipAnswerId)) {
        nextSkippedAnswerIds = Array.from(
          new Set([...skippedAnswerIdsRef.current, parsedSkipAnswerId])
        );
        skippedAnswerIdsRef.current = nextSkippedAnswerIds;
      }

      setIsLoadingNextItem(true);
      try {
        const res = await getNextGradingItem(courseId, undefined, nextSkippedAnswerIds);
        const nextItem = res.gradingItem;
        setStudentCurrentItem(nextItem);
        setStudentCurrentResponses(res.responses || []);
        if (!nextItem) {
          setSelected(undefined);
          return;
        }
        const nextAnswerId = Number(nextItem.answerId);
        if (!Number.isFinite(nextAnswerId)) {
          setSelected(undefined);
          setStudentCurrentItem(null);
          return;
        }
        setSelected({
          homeworkId: nextItem.homeworkId ?? 0,
          questionId: nextItem.questionId,
          studentId: nextItem.studentId,
          answerId: nextAnswerId,
        });
      } finally {
        setIsLoadingNextItem(false);
      }
    },
    [courseId]
  );

  const handleSkip = useCallback(() => {
    const answerId = selected?.answerId;
    if (answerId !== undefined) {
      addTimedSkip(courseId, answerId);
    }
    loadNextStudentItem(answerId);
  }, [courseId, loadNextStudentItem, selected?.answerId]);

  const handleAlwaysSkip = useCallback(() => {
    const answerId = selected?.answerId;
    if (answerId !== undefined) {
      addAlwaysSkip(courseId, answerId);
    }
    loadNextStudentItem(answerId);
  }, [courseId, loadNextStudentItem, selected?.answerId]);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    setRoleResolved(false);
    async function resolveRoleFromInstructorAcl() {
      try {
        const aclIds = await getCourseAcls(courseId, CURRENT_TERM);
        const instructorAclIds = (aclIds || []).filter((id) => id.endsWith('-instructors'));
        if (!instructorAclIds.length) {
          if (!cancelled) setIsInstructorUser(false);
          return;
        }
        const membershipChecks = await Promise.all(
          instructorAclIds.map((aclId) => isUserMember(aclId))
        );
        if (!cancelled) setIsInstructorUser(membershipChecks.some(Boolean));
      } catch {
        if (!cancelled) setIsInstructorUser(false);
      } finally {
        if (!cancelled) setRoleResolved(true);
      }
    }
    resolveRoleFromInstructorAcl();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const effectiveIsPeerGrading = isPeerGrading && !isInstructorUser;

  useEffect(() => {
    if (!courseId || !roleResolved) return;
    if (!isInstructorUser) {
      setGradingItems([]);
      homeworkMap.current = {};
      questionMap.current = {};
      skippedAnswerIdsRef.current = [...readTimedSkips(courseId), ...readAlwaysSkips(courseId)];
      loadNextStudentItem();
      return;
    }
    getCourseGradingItems(courseId).then((res) => {
      setGradingItems(res.gradingItems);
      homeworkMap.current = res.homeworks.reduce((acc, c) => {
        acc[c.id] = c;
        return acc;
      }, {} as Record<string, HomeworkInfo>);
      questionMap.current = res.homeworks.reduce((acc, c) => {
        for (const [id, problem] of Object.entries(c.problems || {})) {
          acc[id] = problem;
        }
        return acc;
      }, {} as Record<string, FTMLProblemWithSolution>);
    });
  }, [courseId, isInstructorUser, loadNextStudentItem, roleResolved]);

  const displayedGradingItems = isInstructorUser
    ? selectedGradedItems
    : studentCurrentItem
    ? [studentCurrentItem]
    : [];

  return (
    <Box>
      {!isInstructorUser && effectiveIsPeerGrading && (
        <Box
          sx={{
            mb: 2,
            px: 2,
            py: 1.5,
            mx: 'auto',
            maxWidth: 900,
            borderRadius: 2.5,
            border: '1px solid rgba(148, 163, 184, 0.28)',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
            backgroundColor: 'background.paper',
          }}
        >
          <Typography
            sx={{
              fontWeight: 500,
              color: 'text.primary',
              fontSize: { xs: '0.98rem', md: '1.05rem' },
              lineHeight: 1.6,
              textAlign: 'center',
            }}
          >
            Peer grading helps you strengthen your understanding by reviewing and evaluating other
            students&apos; solutions.
          </Typography>
        </Box>
      )}
      {isInstructorUser && (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={sortAndFilterParams.showHomeworkOnly}
                  onChange={() =>
                    setSortAndFilterParams({
                      ...sortAndFilterParams,
                      showHomeworkOnly: !sortAndFilterParams.showHomeworkOnly,
                      showPracticeOnly: false,
                    })
                  }
                  color="primary"
                />
              }
              label="Homework Problems Only"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={sortAndFilterParams.showPracticeOnly}
                  onChange={() =>
                    setSortAndFilterParams({
                      ...sortAndFilterParams,
                      showPracticeOnly: !sortAndFilterParams.showPracticeOnly,
                      showHomeworkOnly: false,
                    })
                  }
                  color="primary"
                />
              }
              label="Practice Problems Only"
            />
          </Box>
          <GradingItemOrganizer
            questionMap={questionMap.current}
            homeworkMap={homeworkMap.current}
            gradingItems={gradingItems}
            isPeerGrading={effectiveIsPeerGrading}
            sortAndFilterParams={sortAndFilterParams}
            setSortAndFilterParams={setSortAndFilterParams}
          />
          <Typography sx={{ fontStyle: 'italic' }}>
            <b style={{ color: 'red' }}>{selectedGradedItems.length}</b> Grading Items Selected.
          </Typography>
        </>
      )}
      <Box display="flex" mt={1} flexWrap="wrap" rowGap={0.5}>
        <Box sx={{ border: '1px solid', borderColor: 'divider' }} flex="1 1 200px" maxWidth={300}>
          <GradingItemsList
            gradingItems={displayedGradingItems}
            homeworkMap={homeworkMap.current}
            isPeerGrading={effectiveIsPeerGrading}
            onSelectItem={(homeworkId, questionId, studentId, answerId) =>
              setSelected({ homeworkId, questionId, studentId, answerId })
            }
          />
        </Box>
        <Box border="1px solid #ccc" flex="1 1 400px" p={2} maxWidth="fill-available">
          {!isInstructorUser && (
            <Box mb={1} display="flex" gap={1}>
              <Tooltip title="Hide this problem for 24 hours, then it may reappear.">
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleSkip}
                    disabled={isLoadingNextItem || !selected}
                  >
                    Skip
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Never show this problem to you again.">
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    color="warning"
                    onClick={handleAlwaysSkip}
                    disabled={isLoadingNextItem || !selected}
                  >
                    Pass on this
                  </Button>
                </span>
              </Tooltip>
            </Box>
          )}
          {selected ? (
            <GradingItemDisplay
              {...selected}
              courseId={courseId}
              isPeerGrading={effectiveIsPeerGrading}
              questionMap={questionMap.current}
              peerResponses={!isInstructorUser ? studentCurrentResponses : undefined}
              onAfterGrading={!isInstructorUser ? () => loadNextStudentItem() : undefined}
            />
          ) : (
            <i>
              {isInstructorUser
                ? 'Please click on a grading item on the left.'
                : 'No grading items available.'}
            </i>
          )}
        </Box>
      </Box>
    </Box>
  );
}
