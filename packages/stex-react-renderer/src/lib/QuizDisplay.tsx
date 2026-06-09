import { isEmptyResponse } from '@alea/quiz-utils';
import { FTMLProblemWithSolution, TimerEvent, TimerEventType } from '@alea/spec';
import { shouldUseDrawer } from '@alea/utils';
import { FTML } from '@flexiformal/ftml';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckBox from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
} from '@mui/material';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getLocaleObject } from './lang/utils';
import { FixedPositionMenu, LayoutWithFixedMenu } from './LayoutWithFixedMenu';
import { ProblemDisplay } from './ProblemDisplay';
import { QuizSubmitConfirm } from './QuizSubmitConfirm';
import { QuizTimer, Timer, timerEvent } from './QuizTimer';
import { SafeFTMLFragment } from './SafeFTMLComponents';
import { getPoints } from './stex-react-renderer';

const UNSAVED_ANSWER_CONFIRM_MESSAGE =
  'You have unsaved answer changes. Do you want to leave without saving?';
const UNSAVED_ANSWER_CONFIRM_TITLE = 'Leave without saving?';

function isNonEmptyResponse(resp: FTML.ProblemResponseType) {
  if (resp.type === 'MultipleChoice') {
    const value = resp.value ?? [];
    return value.length > 0 && value.some((r) => r);
  } else if (resp.type === 'SingleChoice') {
    return resp.value !== undefined;
  } else if (resp.type === 'Fillinsol') {
    return (resp.value?.length ?? 0) > 0;
  }
  return false;
}

function numInputsResponded(r: FTML.ProblemResponse | undefined) {
  if (!r?.responses) return 0;
  return r.responses.reduce<number>((prev, resp) => prev + (isNonEmptyResponse(resp) ? 1 : 0), 0);
}

function roundedScore(points: { [problemId: string]: number | undefined }) {
  const score = Object.values(points).reduce<number>((s, a) => s + (a ?? 0), 0);
  return (Math.round(score * 100) / 100).toString();
}

function IndexEntry({
  problem,
  response,
  points,
  idx,
  selectedIdx,
  isFrozen,
  events,
  showClock,
  onSelect,
  isHomeWork,
  isExamProblem,
}: {
  problem: FTMLProblemWithSolution;
  response: FTML.ProblemResponse | undefined;
  points: number | undefined;
  idx: number;
  selectedIdx: number;
  isFrozen: boolean;
  events: TimerEvent[];
  showClock: boolean;
  onSelect: (idx: number) => void;
  isHomeWork: boolean;
  isExamProblem?: boolean;
}) {
  const { quiz: t } = getLocaleObject(useRouter());
  const isCorrectnessKnown =
    isFrozen && points !== undefined && points !== null && Number.isFinite(points);
  const isPartiallyCorrect = points && points > 0;
  const totalPoints = problem.problem.total_points ?? 1;
  const isCorrect = points === totalPoints;
  const color =
    isHomeWork || isExamProblem
      ? '#333'
      : isCorrectnessKnown
      ? isCorrect
        ? 'green'
        : isPartiallyCorrect
        ? '#cc0'
        : 'red'
      : '#333';
  const responded = numInputsResponded(response);
  const numInputs = response?.responses?.length ?? 1;
  const respondedIcon = isFrozen ? (
    <span style={{ width: '24px' }}></span>
  ) : responded === numInputs ? (
    <CheckBox />
  ) : responded === 0 ? (
    <CheckBoxOutlineBlankIcon />
  ) : (
    <IndeterminateCheckBoxIcon />
  );

  return (
    <span
      key={idx}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: idx === selectedIdx ? 'bold' : undefined,
        fontSize: '20px',
        cursor: 'pointer',
        color,
        margin: '8px',
      }}
      onClick={() => onSelect(idx)}
    >
      <Box display="flex" alignItems="center">
        {!isHomeWork && respondedIcon}
        <span>
          &nbsp;{t.problem} {idx + 1}&nbsp;
        </span>
        {!isHomeWork &&
          !isExamProblem &&
          isCorrectnessKnown &&
          (isCorrect ? <CheckCircleIcon /> : <CancelIcon />)}
      </Box>
      {showClock && (
        <Box fontSize="12px">
          <Timer events={events} problemIndex={idx} />
        </Box>
      )}
    </span>
  );
}

function ProblemNavigation({
  problems,
  responses,
  points,
  problemIdx,
  isFrozen,
  showClock,
  events,
  onClose,
  onSelect,
  isHomeWork,
  isExamProblem,
}: {
  problems: Record<string, FTMLProblemWithSolution>;
  responses: Record<string, FTML.ProblemResponse | undefined>;
  points: Record<string, number>;
  problemIdx: number;
  isFrozen: boolean;
  showClock: boolean;
  events: TimerEvent[];
  onClose: () => void;
  onSelect: (idx: number) => void;
  isHomeWork: boolean;
  isExamProblem?: boolean;
}) {
  return (
    <FixedPositionMenu
      staticContent={
        <Box display="flex" alignItems="center">
          <IconButton sx={{ m: '2px' }} onClick={() => onClose()}>
            <CloseIcon />
          </IconButton>
        </Box>
      }
    >
      {Object.keys(responses).map((problemId, idx) => (
        <IndexEntry
          key={problemId}
          problem={problems[problemId]}
          response={responses[problemId]}
          points={points[problemId]}
          idx={idx}
          events={events}
          showClock={showClock}
          selectedIdx={problemIdx}
          isFrozen={isFrozen}
          onSelect={onSelect}
          isHomeWork={isHomeWork}
          isExamProblem={isExamProblem}
        />
      ))}
    </FixedPositionMenu>
  );
}

export function ListStepper({
  idx,
  listSize,
  onChange,
}: {
  idx: number;
  listSize: number;
  onChange: (idx: number) => void;
}) {
  const { quiz: t } = getLocaleObject(useRouter());
  if (listSize <= 1) return null;
  return (
    <Box>
      <Button
        onClick={() => onChange(idx - 1)}
        disabled={idx <= 0}
        size="small"
        variant="contained"
        sx={{ mr: '10px' }}
      >
        <NavigateBeforeIcon />
        {t.prev}
      </Button>

      <Button
        onClick={() => onChange(idx + 1)}
        disabled={idx >= listSize - 1}
        size="small"
        variant="contained"
      >
        {t.next}
        <NavigateNextIcon />
      </Button>
    </Box>
  );
}

function computeResult(
  problems: Record<string, FTMLProblemWithSolution>,
  responses: Record<string, FTML.ProblemResponse | undefined>
) {
  const points: { [problemId: string]: number } = {};
  for (const problemId of Object.keys(problems ?? {})) {
    const r = responses[problemId];
    const p = problems[problemId];
    points[problemId] = getPoints(p, r);
  }
  return points;
}

export function QuizDisplay({
  problems,
  onResponse,
  onSubmit,
  quizEndTs,
  showPerProblemTime = false,
  existingResponses,
  isFrozen,
  homeworkId,
  isExamProblem = false,
  initialProblemIdx = 0,
  frozenProblems,
  onProblemFreeze,
}: {
  quizEndTs?: number;
  showPerProblemTime: boolean;
  problems: Record<string, FTMLProblemWithSolution>;
  existingResponses: { [problemId: string]: FTML.ProblemResponse };
  isFrozen: boolean;
  onResponse?: (problemId: string, r: FTML.ProblemResponse) => void;
  onSubmit?: (
    events: TimerEvent[],
    responses: { [problemId: string]: FTML.ProblemResponse | undefined },
    result: { [problemId: string]: number | undefined }
  ) => void;
  homeworkId?: number;
  isExamProblem?: boolean;
  initialProblemIdx?: number;
  frozenProblems?: Record<string, boolean>;
  onProblemFreeze?: (problemId: string) => void;
}) {
  const isHomeWork = homeworkId ? true : false;
  const router = useRouter();
  const { quiz: t } = getLocaleObject(router);
  const [points, setPoints] = useState<{ [problemId: string]: number }>({});
  const [responses, setResponses] = useState<Record<string, FTML.ProblemResponse | undefined>>({});
  const [problemIdx, setProblemIdx] = useState(initialProblemIdx);
  const [showDashboard, setShowDashboard] = useState(!shouldUseDrawer());
  const [events, setEvents] = useState<TimerEvent[]>([]);
  const [showClock, setShowClock] = useState(true);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [pendingProblemIdx, setPendingProblemIdx] = useState<number | null>(null);
  const [pendingRouteUrl, setPendingRouteUrl] = useState<string | null>(null);
  const unsavedAnswerIdsRef = useRef<Record<string, true>>({});

  const problemIds = Object.keys(problems ?? {});
  const currentProblemId = problemIds[problemIdx];

  useEffect(() => {
    if (initialProblemIdx !== undefined && initialProblemIdx !== -1) {
      setProblemIdx(initialProblemIdx);
    }
  }, [initialProblemIdx]);

  useEffect(() => {
    const numQ = Object.keys(problems ?? {}).length || 0;
    if (numQ === 0) return;
    setEvents([timerEvent(TimerEventType.SWITCH, 0)]);

    const rs: Record<string, FTML.ProblemResponse | undefined> = {};
    for (const problemId of Object.keys(problems ?? {})) {
      const e = existingResponses[problemId];
      rs[problemId] = e;
    }
    setResponses(rs);
    unsavedAnswerIdsRef.current = {};
  }, [problems, existingResponses]);

  useEffect(() => {
    if (!isFrozen) return;
    setPoints(computeResult(problems, responses));
  }, [isFrozen, problems, responses]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (Object.keys(unsavedAnswerIdsRef.current).length === 0) return;
      event.preventDefault();
      event.returnValue = '';
      return '';
    }

    function handleRouteChangeStart(url: string) {
      if (Object.keys(unsavedAnswerIdsRef.current).length === 0) return;
      if (url === router.asPath) return;
      setPendingRouteUrl(url);
      const error = new Error('Route change aborted because answers are unsaved.');
      (error as { cancelled?: boolean }).cancelled = true;
      router.events.emit('routeChangeError', error, url, { shallow: false });
      throw error;
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    router.events.on('routeChangeStart', handleRouteChangeStart);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      router.events.off('routeChangeStart', handleRouteChangeStart);
    };
  }, [router]);

  function hasUnsavedAnswersForCurrentProblem() {
    return currentProblemId
      ? Object.keys(unsavedAnswerIdsRef.current).some((answerId) =>
          answerId.startsWith(`${currentProblemId}::`)
        )
      : false;
  }

  function clearUnsavedAnswersForCurrentProblem() {
    if (!currentProblemId) return;
    for (const answerId of Object.keys(unsavedAnswerIdsRef.current)) {
      if (answerId.startsWith(`${currentProblemId}::`)) {
        delete unsavedAnswerIdsRef.current[answerId];
      }
    }
  }

  function navigateToProblem(i: number) {
    setProblemIdx(i);
    if (isFrozen) return;
    setEvents((prev) => [...prev, timerEvent(TimerEventType.SWITCH, i)]);
  }

  const handleUnsavedAnswerChange = useCallback((answerId: string, hasUnsavedChanges: boolean) => {
    if (hasUnsavedChanges) {
      unsavedAnswerIdsRef.current[answerId] = true;
    } else {
      delete unsavedAnswerIdsRef.current[answerId];
    }
  }, []);

  function setProblemIdx2(i: number) {
    if (i === problemIdx) return;
    if (hasUnsavedAnswersForCurrentProblem()) {
      setPendingProblemIdx(i);
      return;
    }
    navigateToProblem(i);
  }

  function closeUnsavedAnswerDialog() {
    setPendingProblemIdx(null);
    setPendingRouteUrl(null);
  }

  function leaveWithoutSaving() {
    const nextProblemIdx = pendingProblemIdx;
    const nextRouteUrl = pendingRouteUrl;
    closeUnsavedAnswerDialog();

    if (nextProblemIdx !== null) {
      clearUnsavedAnswersForCurrentProblem();
      navigateToProblem(nextProblemIdx);
      return;
    }

    if (nextRouteUrl) {
      unsavedAnswerIdsRef.current = {};
      router.push(nextRouteUrl);
    }
  }

  function onPause() {
    if (isFrozen) return;
    setEvents((prev) => [...prev, timerEvent(TimerEventType.PAUSE)]);
  }

  function onUnpause() {
    if (isFrozen) return;
    setEvents((prev) => [...prev, timerEvent(TimerEventType.UNPAUSE)]);
  }

  if (problemIds.length === 0) return <CircularProgress />;
  if (Object.keys(responses).length !== problemIds.length) return <CircularProgress size="2em" />;
  const response = responses[currentProblemId];
  const problem = problems[currentProblemId];

  return (
    <LayoutWithFixedMenu
      menu={
        <ProblemNavigation
          problems={problems}
          points={points}
          responses={responses}
          problemIdx={problemIdx}
          isFrozen={isFrozen}
          showClock={showClock && showPerProblemTime}
          events={events}
          onClose={() => setShowDashboard(false)}
          onSelect={(i) => setProblemIdx2(i)}
          isHomeWork={isHomeWork}
          isExamProblem={isExamProblem}
        />
      }
      topOffset={64}
      showDashboard={showDashboard}
      setShowDashboard={setShowDashboard}
    >
      <Box px="10px" maxWidth="800px" m="auto">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <h2>
            {t.problem} {problemIdx + 1} {t.of} {problemIds.length}&nbsp;
            <SafeFTMLFragment
              key={problem.problem.html ?? ''}
              allowHovers={isFrozen}
              fragment={{
                type: 'HtmlString',
                html: problem.problem.title_html ?? '<i>Untitled</i>',
                uri: undefined,
              }}
            />
          </h2>
          {(!!quizEndTs || showPerProblemTime) && (
            <QuizTimer
              quizEndTs={quizEndTs}
              events={events}
              showClock={showClock}
              showHideClock={(v) => setShowClock(v)}
              onPause={() => onPause()}
              onUnpause={() => onUnpause()}
            />
          )}
        </Box>
        <Box my="10px">
          <ProblemDisplay
            uri={currentProblemId}
            r={response}
            problem={problem}
            isFrozen={isFrozen || !!frozenProblems?.[currentProblemId]}
            onResponseUpdate={(response) => {
              if (isEmptyResponse(response)) return;
              const problemId = problemIds[problemIdx];
              setResponses((prev) => ({ ...prev, [problemId]: response }));
              onResponse?.(problemId, response);
            }}
            onFreezeResponse={onProblemFreeze ? () => onProblemFreeze(currentProblemId) : undefined}
            onUnsavedAnswerChange={handleUnsavedAnswerChange}
          />
        </Box>
        <ListStepper
          idx={problemIdx}
          listSize={problemIds.length}
          onChange={(idx) => setProblemIdx2(idx)}
        />
        {!isFrozen ? (
          !!onSubmit && (
            <Button
              onClick={() => setShowSubmitDialog(true)}
              sx={{ my: '20px' }}
              variant="contained"
            >
              {t.finish}
            </Button>
          )
        ) : Object.values(points).every((s) => s !== undefined && !Number.isNaN(s)) ? (
          !isHomeWork &&
          !isExamProblem && (
            <i style={{ margin: '20px 0', color: '#333', fontSize: '26px' }}>
              {t.youScored.replace('$1', roundedScore(points)).replace(
                '$2',
                Object.values(problems)
                  .reduce((a, b) => a + (b.problem.total_points ?? 1), 0)
                  .toString()
              )}
            </i>
          )
        ) : (
          <i style={{ margin: '20px 0', color: '#333', fontSize: '26px' }}>{t.feedbackAwaited}</i>
        )}
      </Box>

      {!!onSubmit && (
        <Dialog open={showSubmitDialog} onClose={() => setShowSubmitDialog(false)}>
          <QuizSubmitConfirm
            left={Object.values(responses).filter((r) => !numInputsResponded(r)).length}
            onClose={(submit) => {
              setShowSubmitDialog(false);
              if (!submit) return;

              onSubmit(events, responses, points);
              setEvents((prev) => [...prev, timerEvent(TimerEventType.SUBMIT)]);
            }}
          />
        </Dialog>
      )}
      <Dialog
        open={pendingProblemIdx !== null || pendingRouteUrl !== null}
        onClose={closeUnsavedAnswerDialog}
      >
        <DialogTitle>{UNSAVED_ANSWER_CONFIRM_TITLE}</DialogTitle>
        <DialogContent>
          <DialogContentText>{UNSAVED_ANSWER_CONFIRM_MESSAGE}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeUnsavedAnswerDialog}>Cancel</Button>
          <Button onClick={leaveWithoutSaving} autoFocus>
            Leave
          </Button>
        </DialogActions>
      </Dialog>
    </LayoutWithFixedMenu>
  );
}
