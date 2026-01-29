import { FTML } from '@flexiformal/ftml';
import { SettingsBackupRestore } from '@mui/icons-material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CloseIcon from '@mui/icons-material/Close';
import ShieldIcon from '@mui/icons-material/Shield';
import {
  Button,
  Checkbox,
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
import {
  AnswerClass,
  AnswerResponse,
  CreateAnswerClassRequest,
  createGrading,
  FTMLProblemWithSolution,
  getAnswerAdmin,
  getAnswerInfo,
  getAnswersWithGrading,
  getCourseGradingItems,
  GradingInfo,
  GradingItem,
  HomeworkInfo,
  ResponseWithSubProblemId,
  Tristate,
} from '@alea/spec';
import { SafeHtml } from '@alea/react-utils';
import {
  AnswerContext,
  GradingContext,
  GradingCreator,
  ProblemDisplay,
  ShowGradingFor,
} from '@alea/stex-react-renderer';
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

function getSelectedGradingItems(
  items: GradingItem[],
  params: SortAndFilterParams,
  homeworkMap: Record<string, HomeworkInfo>,
  questionMap: Record<string, FTMLProblemWithSolution>
) {
  function getValue(item: GradingItem, field: SortField) {
    if (field === 'homeworkDate') return homeworkMap[item.homeworkId]?.givenTs;
    if (field === 'questionTitle') return item.questionId + '(TODO ALEA4-P4)'; // questionMap[item.questionId]?.problem;
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

function TriStateCheckbox({
  value,
  onChange,
}: {
  value: Tristate;
  onChange: (newValue: Tristate) => void;
}) {
  return (
    <Checkbox
      checked={value === Tristate.TRUE}
      indeterminate={value === Tristate.UNKNOWN}
      icon={<CloseIcon />}
      indeterminateIcon={<CheckBoxOutlineBlankIcon />}
      onChange={(e) => {
        const newVal =
          value === Tristate.UNKNOWN
            ? Tristate.TRUE
            : value === Tristate.TRUE
            ? Tristate.FALSE
            : Tristate.UNKNOWN;
        onChange(newVal);
      }}
    />
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
  problemMap,
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
  problemMap: Record<string, FTMLProblemWithSolution>;
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
              numSubProblemsGraded,
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
                primary={
                  <SafeHtml html={problemMap[questionId]?.problem.title_html ?? questionId} />
                }
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
  homeworkId,
  questionId,
  studentId,
  answerId,
  questionMap,
  courseId,
  isPeerGrading,
  onNextGradingItem,
  onPrevGradingItem,
}: {
  homeworkId: number;
  questionId: string;
  studentId: string;
  answerId: number;
  courseId: string;
  isPeerGrading?: boolean;
  questionMap: Record<string, FTMLProblemWithSolution>;
  onNextGradingItem: () => void;
  onPrevGradingItem: () => void;
}) {
  const [studentResponse, setStudentResponse] =
    useState<Record<string, ResponseWithSubProblemId>>();
  const [problem, setProblem] = useState<FTMLProblemWithSolution | null>(
    questionMap[questionId] || null
  );
  const [answerClasses, setAnswerClasses] = useState<AnswerClass[]>();
  const refreshGradingInfo = useCallback(() => {
    if (!isPeerGrading) {
      getAnswerAdmin(courseId, answerId).then((c) => {
        const r: Record<string, ResponseWithSubProblemId> = {};
        r[questionId] = {
          problemId: questionId,
          responses: [{ subProblemId: c.subProblemId, answer: c.answer }],
        };
        setStudentResponse(r);
      });
    }
    getAnswerInfo(answerId, courseId, questionId).then((r) => {
      if (r.subProblemId === questionId) setAnswerClasses(problem.answerClasses);
      else
        setAnswerClasses(
          problem.problem.subProblems.filter((c) => c.id === r.subProblemId)[0]?.answerClasses
        );
    });
  }, [homeworkId, questionId, studentId]);

  useEffect(() => {
    refreshGradingInfo();
  }, [homeworkId, questionId, studentId]);

  useEffect(() => {
    if (questionMap[questionId]) {
      setProblem(questionMap[questionId]);
      return;
    }
    const fetchProblem = async () => {
      try {
        // TODO ALEA4-P4
        // const problemIdPrefix = questionId.replace(/\?[^?]*$/, '');
        // const problemObject = await getProblemObjects(problemIdPrefix);
        // const problemHtml = await getLearningObjectShtml(problemObject);
        // setProblem(getProblem(problemHtml, ''));
      } catch (error) {
        console.error('Error fetching problem:', error);
      }
    };
    fetchProblem();
  }, [questionId, questionMap]);

  return (
    <Box maxWidth={900}>
      <AnswerContext.Provider value={studentResponse}>
        <ProblemDisplay
          isFrozen={true}
          // problemId={questionId} TODO ALEA4-P4
          problem={problem}
          onResponseUpdate={() => {
            console.log('onResponseUpdate');
          }}
        />
      </AnswerContext.Provider>
      <GradingProblem
        answerClasses={answerClasses}
        onNewGrading={async (acs, feedback) => {
          await createGrading({ answerId, answerClasses: acs, customFeedback: feedback });
          refreshGradingInfo();
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

  useEffect(() => {
    if (!courseId) return;
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
  }, [courseId]);

  return (
    <Box>
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
        isPeerGrading={isPeerGrading}
        sortAndFilterParams={sortAndFilterParams}
        setSortAndFilterParams={setSortAndFilterParams}
      />
      <Typography sx={{ fontStyle: 'italic' }}>
        <b style={{ color: 'red' }}>{selectedGradedItems.length}</b> Grading Items Selected.
      </Typography>
      <Box display="flex" mt={1} flexWrap="wrap" rowGap={0.5}>
        <Box sx={{ border: '1px solid #ccc' }} flex="1 1 200px" maxWidth={300}>
          <GradingItemsList
            gradingItems={selectedGradedItems}
            homeworkMap={homeworkMap.current}
            problemMap={questionMap.current}
            isPeerGrading={isPeerGrading}
            onSelectItem={(homeworkId, questionId, studentId, answerId) =>
              setSelected({ homeworkId, questionId, studentId, answerId })
            }
          />
        </Box>
        <Box border="1px solid #ccc" flex="1 1 400px" p={2} maxWidth="fill-available">
          {selected ? (
            <GradingItemDisplay
              {...selected}
              courseId={courseId}
              questionMap={questionMap.current}
              onNextGradingItem={() => {
                const idx = selectedGradedItems.findIndex(
                  (item) =>
                    item.homeworkId === selected.homeworkId &&
                    item.questionId === selected.questionId &&
                    item.studentId === selected.studentId
                );

                if (idx === selectedGradedItems.length - 1) return;
                const newIdx = idx === -1 ? 0 : idx + 1;
                const { homeworkId, questionId, studentId, answerId } = selectedGradedItems[newIdx];
                setSelected({ homeworkId, questionId, studentId, answerId });
              }}
              onPrevGradingItem={() => {
                const idx = selectedGradedItems.findIndex(
                  (item) =>
                    item.homeworkId === selected.homeworkId &&
                    item.questionId === selected.questionId &&
                    item.studentId === selected.studentId
                );

                if (idx === 0) return;
                const newIdx = idx === 0 ? selectedGradedItems.length - 1 : idx - 1;
                const { homeworkId, questionId, studentId, answerId } = selectedGradedItems[newIdx];
                setSelected({ homeworkId, questionId, studentId, answerId });
              }}
            />
          ) : (
            <i>Please click on a grading item on the left.</i>
          )}
        </Box>
      </Box>
    </Box>
  );
}
