import { SafeHtml } from '@alea/react-utils';
import {
  AnswerClass,
  CreateAnswerClassRequest,
  createGrading,
  FTMLProblemWithSolution,
  getAnswerAdmin,
  getAnswerInfo,
  getCourseAcls,
  getCourseGradingItems,
  getNextGradingItem,
  GradingItem,
  HomeworkInfo,
  isUserMember,
  ResponseWithSubProblemId,
  Tristate,
} from '@alea/spec';
import { AnswerContext, GradingCreator, ProblemDisplay } from '@alea/stex-react-renderer';
import { CURRENT_TERM, getParamFromUri } from '@alea/utils';
import { contentFragment } from '@flexiformal/ftml-backend';
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
  Typography,
} from '@mui/material';
import Box from '@mui/material/Box';
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MultiItemSelector } from './MultiItemsSelector';
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

function GradingProblem({
  onNewGrading,
  answerClasses,
}: {
  onNewGrading: (acs: CreateAnswerClassRequest[], feedback: string) => Promise<void>;
  answerClasses: AnswerClass[];
}) {
  return (
    <Box>
      <GradingCreator onNewGrading={onNewGrading} rawAnswerClasses={answerClasses}></GradingCreator>
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
  //const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);
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
                primary={`Problem ${idx + 1}`}
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
  peerResponses?: { subProblemId: string; answer: string }[];
}) {
  const [studentResponse, setStudentResponse] =
    useState<Record<string, ResponseWithSubProblemId>>();
  const [problem, setProblem] = useState<FTMLProblemWithSolution | undefined>(
    getMappedProblem(questionMap, questionId)
  );
  const [answerClasses, setAnswerClasses] = useState<AnswerClass[]>();

  const refreshGradingInfo = useCallback(() => {
    const lookupKey = getParamFromUri(questionId, 'a') ?? questionId;
    if (isPeerGrading) {
      const responses = Array.isArray(peerResponses) ? peerResponses : [];
      const r: Record<string, ResponseWithSubProblemId> = {};
      r[questionId] = { problemId: questionId, responses };
      if (lookupKey !== questionId) {
        r[lookupKey] = { problemId: lookupKey, responses };
      }
      setStudentResponse(r);
    } else {
      getAnswerAdmin(courseId, answerId).then((c) => {
        const r: Record<string, ResponseWithSubProblemId> = {};
        const responses = Array.isArray(c?.responses)
          ? c.responses
          : [{ subProblemId: c?.subProblemId, answer: c?.answer }];
        r[questionId] = {
          problemId: questionId,
          responses,
        };
        if (lookupKey !== questionId) {
          r[lookupKey] = {
            problemId: lookupKey,
            responses,
          };
        }
        setStudentResponse(r);
      });
    }
    getAnswerInfo(answerId, courseId, questionId).then((r) => {
      if (!problem) {
        setAnswerClasses([]);
        return;
      }
      if (r.subProblemId === questionId || r.subProblemId === lookupKey) {
        setAnswerClasses(problem.answerClasses || []);
        return;
      }
      const subClasses =
        problem.problem?.subProblems?.find((c) => c.id === r.subProblemId)?.answerClasses || [];
      setAnswerClasses(subClasses);
    });
  }, [answerId, courseId, isPeerGrading, peerResponses, problem, questionId]);

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
        const fragmentResponse = (await contentFragment({ uri: questionId })) as unknown[];
        setProblem({
          problem: {
            uri: questionId,
            html: (fragmentResponse?.[2] as string) || '',
            title_html: (fragmentResponse?.[1] as string) || '',
          },
          answerClasses: [],
        });
      } catch (error) {
        console.error('Error fetching problem:', error);
      }
    };
    fetchProblem();
  }, [questionId, questionMap]);

  return (
    <Box maxWidth={900}>
      <AnswerContext.Provider value={studentResponse}>
        <ProblemDisplay isFrozen={true} problem={problem} />
      </AnswerContext.Provider>
      <GradingProblem
        answerClasses={answerClasses}
        onNewGrading={async (acs, feedback) => {
          await createGrading({ answerId, answerClasses: acs, customFeedback: feedback });
          refreshGradingInfo();
          await onAfterGrading?.();
        }}
      ></GradingProblem>
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
    { subProblemId: string; answer: string }[]
  >([]);
  const skippedAnswerIdsRef = useRef<number[]>([]);
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
      skippedAnswerIdsRef.current = [];
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
            <Box mb={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => loadNextStudentItem(selected?.answerId)}
                disabled={isLoadingNextItem || !selected}
              >
                Skip
              </Button>
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
            <i>{isInstructorUser ? 'Please click on a grading item on the left.' : 'No grading items available.'}</i>
          )}
        </Box>
      </Box>
    </Box>
  );
}
