import { MdEditor } from '@alea/markdown';
import {
  AnswerUpdateEntry,
  FTMLProblemWithSolution,
  ProblemAnswerEvent,
  ResponseWithSubProblemId,
  createAnswer,
  postAnswerToLMP,
} from '@alea/spec';
import { FTML } from '@flexiformal/ftml';
import { solution as fetchMasterSolutionPayload } from '@flexiformal/ftml-backend';
import { SafeFTMLFragment } from './SafeFTMLComponents';
import SaveIcon from '@mui/icons-material/Save';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getPoints } from './stex-react-renderer';
import { ShowSubProblemAnswer } from './SubProblemAnswer';
import { useCurrentUser } from '@alea/react-utils';
import { getProblemPointsFromDocument } from '@alea/quiz-utils';

export function PointsInfo({ points, compact = false }: { points: number; compact?: boolean }) {
  return (
    <Typography
      variant={compact ? 'body2' : 'h6'}
      sx={{ display: 'flex', justifyContent: 'flex-end', whiteSpace: 'nowrap' }}
    >
      <b>{points} pt</b>
    </Typography>
  );
}

function SubProblemPointsInfo({
  problemUri,
  showPoints,
  onRender,
}: {
  problemUri: string;
  showPoints: boolean;
  onRender?: () => void;
}) {
  const [points, setPoints] = useState<number | undefined>();

  useEffect(() => {
    onRender?.();
  }, [onRender]);

  useEffect(() => {
    if (!showPoints) return;
    let cancelled = false;
    setPoints(undefined);
    getProblemPointsFromDocument(problemUri)
      .then((nextPoints) => {
        if (!cancelled) setPoints(nextPoints);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [problemUri, showPoints]);

  if (!showPoints || points == null) return null;
  return <PointsInfo points={points} compact />;
}

export const AnswerContext = createContext<Record<string, ResponseWithSubProblemId>>({});
const MasterSolutionVisibilityContext = createContext(true);

type PreviousAnswerResponse = ResponseWithSubProblemId['responses'][number] & {
  graded?: boolean;
};

function hasSubProblemsInHtml(html: string) {
  return (html.match(/data-ftml-problem=/g)?.length ?? 0) > 1;
}

function normalizeAnswerProblemId(problemId?: string) {
  return (problemId ?? '').replace(/\/+$/, '');
}

function findPreviousResponse(
  responses: ResponseWithSubProblemId['responses'] | undefined,
  problemId: string,
  masterProblemId: string
): PreviousAnswerResponse | undefined {
  if (!responses?.length) return undefined;

  const normalizedProblemId = normalizeAnswerProblemId(problemId);
  const exactResponse = responses.find(
    (response) => normalizeAnswerProblemId(response.subProblemId) === normalizedProblemId
  );
  if (exactResponse) return exactResponse as PreviousAnswerResponse;

  return normalizedProblemId === normalizeAnswerProblemId(masterProblemId)
    ? (responses[0] as PreviousAnswerResponse)
    : undefined;
}

function transformData(dimensionAndURI: string[], quotient: number): AnswerUpdateEntry[] {
  const conceptUpdate: { [url: string]: AnswerUpdateEntry } = {};

  dimensionAndURI.forEach((item) => {
    const [dimension, uri] = item.split(':');
    const url = decodeURIComponent(uri);
    if (!conceptUpdate[url]) {
      conceptUpdate[url] = {
        concept: url,
        dimensions: [],
        quotient,
      };
    }
    if (!conceptUpdate[url].dimensions.includes(dimension)) {
      conceptUpdate[url].dimensions.push(dimension);
    }
  });
  return Object.values(conceptUpdate);
}

function getUpdates(
  objectives: [FTML.CognitiveDimension, FTML.SymbolUri][] | undefined,
  quotient: number
) {
  if (!objectives) return [];
  const dimensionAndURI = objectives.map(([dim, uri]) => `${dim}:${uri}`);
  return transformData(dimensionAndURI, quotient);
}

function handleSubmit(
  problem: FTMLProblemWithSolution,
  uri: string,
  response: FTML.ProblemResponse,
  userId: string
) {
  const maxPoint = problem.problem?.total_points ?? 1;
  const points = getPoints(problem, response);
  const quotient = points ? points / maxPoint : 0;
  const updates: AnswerUpdateEntry[] = getUpdates(problem.problem.objectives, quotient);
  const answerObject: ProblemAnswerEvent = {
    type: 'problem-answer',
    uri: uri.substring(0, uri.indexOf('.en')) + '.tex',
    learner: userId,
    score: points,
    'max-points': maxPoint,
    updates: updates,
    time: new Date().toISOString(),
    payload: '',
    comment: ' ',
  };
  postAnswerToLMP(answerObject);
}

export function getProblemState(
  isFrozen: boolean,
  solution?: string,
  current_response?: FTML.ProblemResponse
): FTML.ProblemState {
  if (!isFrozen) return { type: 'Interactive', current_response, solution: undefined };
  if (!solution) return { type: 'Finished', current_response };
  const sol = FTML.Solutions.from_jstring(solution.replace(/^"|"$/g, ''));
  const feedback = current_response
    ? sol?.check_response(current_response)
    : sol?.default_feedback();
  if (!feedback) return { type: 'Finished', current_response }; // Something went wrong!!
  return { type: 'Graded', feedback: feedback.to_json() };
}

export function ProblemViewer({
  problem,
  onResponseUpdate,
  isFrozen,
  r,
  renderBelowAnswerAccepter,
  hideAnswerAccepter = false,
  showPoints = true,
  showSolution = true,
  onSubProblemRender,
  onUnsavedAnswerChange,
}: {
  problem: FTMLProblemWithSolution;
  onResponseUpdate?: (response: FTML.ProblemResponse) => void;
  isFrozen: boolean;
  r?: FTML.ProblemResponse;
  renderBelowAnswerAccepter?: (problemId: string, isSubProblem: boolean) => ReactNode;
  hideAnswerAccepter?: boolean;
  showPoints?: boolean;
  showSolution?: boolean;
  onSubProblemRender?: () => void;
  onUnsavedAnswerChange?: (answerId: string, hasUnsavedChanges: boolean) => void;
}) {
  // Use a ref so problemWrap always calls the latest renderBelowAnswerAccepter
  // even when SafeFTMLFragment caches the wrapper from the first render.
  const renderBelowRef = useRef(renderBelowAnswerAccepter);
  useEffect(() => {
    renderBelowRef.current = renderBelowAnswerAccepter;
  });

  const problemState = getProblemState(isFrozen, problem.solution, r);
  const { html, uri } = problem.problem;
  const problemStates = new Map([[uri, problemState]]);
  problem.problem?.subProblems?.forEach((c) => {
    problemStates.set(c.id, getProblemState(isFrozen, c.solution, r));
  });

  return (
    <MasterSolutionVisibilityContext.Provider value={showSolution}>
      <SafeFTMLFragment
        key={`${uri}-${problemState.type}`}
        fragment={{ type: 'HtmlString', html, uri }}
        allowHovers={isFrozen}
        problemStates={problemStates}
        onProblemResponse={(response) => {
          onResponseUpdate?.(response); //todo: make it free from nap because problem response does not looks for naps.
        }}
        problemWrap={(problemUri, isSubProblem, autogradable) => {
          return (ch: ReactNode) => (
            <Box>
              {ch}
              {!autogradable && !hideAnswerAccepter ? (
                <AnswerAccepter
                  masterProblemId={uri}
                  problemTitle={problem.problem.title_html ?? ''}
                  isFrozen={isFrozen}
                  problemId={problemUri}
                  pointsNode={
                    isSubProblem ? (
                      <SubProblemPointsInfo
                        problemUri={problemUri}
                        showPoints={showPoints}
                        onRender={onSubProblemRender}
                      />
                    ) : null
                  }
                  onUnsavedAnswerChange={onUnsavedAnswerChange}
                ></AnswerAccepter>
              ) : null}
              {renderBelowRef.current?.(problemUri, isSubProblem)}
            </Box>
          );
        }}
      />
    </MasterSolutionVisibilityContext.Provider>
  );
}

function getDraftAnswer(name: string) {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(name) ?? '';
}

function getAnswerValue(name: string, serverAnswer: string) {
  return getDraftAnswer(name) || serverAnswer || '';
}

function setDraftAnswer(name: string, answer: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(name, answer);
}

function getLocallySavedAnswerKey(name: string) {
  return `${name}-saved`;
}

function getLocallySavedAnswer(name: string) {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(getLocallySavedAnswerKey(name)) ?? '';
}

function getSavedAnswerValue(name: string, serverAnswer: string) {
  return getLocallySavedAnswer(name) || serverAnswer || '';
}

function setLocallySavedAnswer(name: string, answer: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getLocallySavedAnswerKey(name), answer);
}

function getUnsavedAnswerId(masterProblemId: string, problemId: string) {
  return `${masterProblemId || problemId}::${problemId}`;
}

function hasUnsavedAnswerChange(answer: string, savedAnswer: string, isAnswerGraded: boolean) {
  if (isAnswerGraded) return false;
  if (!savedAnswer.trim() && !answer.trim()) return false;
  return answer !== savedAnswer;
}

function getSolutionHtmlFromFtmlPayload(payload?: string): string | undefined {
  if (!payload?.trim()) return undefined;
  try {
    const parsed = FTML.Solutions.from_jstring(payload.replace(/^"|"$/g, ''));
    const html = parsed
      ?.to_solutions()
      .map((s) => ('Solution' in s ? s.Solution.html : undefined))
      .filter(Boolean)
      .join('');
    return html?.trim() ? html : undefined;
  } catch {
    return undefined;
  }
}

function MasterSolutionDisplay({
  problemId,
  shouldShow,
}: {
  problemId: string;
  shouldShow: boolean;
}) {
  const [solutionHtml, setSolutionHtml] = useState<string | undefined>();

  useEffect(() => {
    if (!shouldShow || !problemId) {
      setSolutionHtml(undefined);
      return;
    }
    let cancelled = false;
    setSolutionHtml(undefined);
    fetchMasterSolutionPayload({ uri: problemId })
      .then((payload) => {
        if (!cancelled) setSolutionHtml(getSolutionHtmlFromFtmlPayload(payload));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [shouldShow, problemId]);

  if (!solutionHtml) return null;
  return (
    <Box sx={problemDisplayStyles.solutionBox}>
      <Typography variant="caption" sx={problemDisplayStyles.solutionLabelText}>
        Solution
      </Typography>
      <Box sx={problemDisplayStyles.solutionContent}>
        <SafeFTMLFragment fragment={{ type: 'HtmlString', html: solutionHtml, uri: problemId }} />
      </Box>
    </Box>
  );
}

function AnswerAccepter({
  problemId,
  masterProblemId,
  isFrozen,
  problemTitle,
  pointsNode,
  onUnsavedAnswerChange,
}: {
  problemId: string;
  masterProblemId: string;
  isFrozen: boolean;
  problemTitle: string;
  pointsNode?: ReactNode;
  onUnsavedAnswerChange?: (answerId: string, hasUnsavedChanges: boolean) => void;
}) {
  const showMasterSolution = useContext(MasterSolutionVisibilityContext);
  const previousAnswer = useContext(AnswerContext);
  const name = `answer-${problemId}`;
  let serverAnswer = '';
  let isAnswerGraded = false;
  if (previousAnswer !== undefined) {
    const previousResponse = findPreviousResponse(
      previousAnswer[masterProblemId]?.responses ?? previousAnswer[problemId]?.responses,
      problemId,
      masterProblemId
    );
    serverAnswer = previousResponse?.answer ?? '';
    isAnswerGraded = previousResponse?.graded === true;
  }
  const [answer, setAnswer] = useState<string>(() => getAnswerValue(name, serverAnswer));
  const [savedAnswer, setSavedAnswer] = useState<string>(() =>
    getSavedAnswerValue(name, serverAnswer)
  );
  const router = useRouter();
  const hasUnsavedAnswer = hasUnsavedAnswerChange(answer, savedAnswer, isAnswerGraded);
  const canSaveAnswer = hasUnsavedAnswer && !!answer?.trim();
  const unsavedAnswerId = getUnsavedAnswerId(masterProblemId, problemId);
  const shouldRenderMasterSolution = showMasterSolution && (isFrozen || isAnswerGraded) && !!answer;

  useEffect(() => {
    setAnswer(getAnswerValue(name, serverAnswer));
    setSavedAnswer(getSavedAnswerValue(name, serverAnswer));
  }, [name, serverAnswer]);

  useEffect(() => {
    onUnsavedAnswerChange?.(unsavedAnswerId, hasUnsavedAnswer);
  }, [hasUnsavedAnswer, onUnsavedAnswerChange, unsavedAnswerId]);

  async function saveAnswer({ freeTextResponses }: { subId?: string; freeTextResponses: string }) {
    try {
      const accepted = await createAnswer({
        answer: freeTextResponses,
        questionId: masterProblemId ? masterProblemId : problemId,
        questionTitle: problemTitle,
        subProblemId: problemId ?? '',
        courseId: router.query.courseId as string,
        institutionId: 'FAU',
        homeworkId: +(router.query.id ?? 0),
      });
      return accepted;
    } catch {
      alert('Failed to save answers. Please try again.');
      return false;
    }
  }
  async function onSaveClick() {
    const saved = await saveAnswer({ freeTextResponses: answer, subId: problemId });
    if (saved) {
      // Keep the saved value locally until the answer context is refreshed from the server.
      setLocallySavedAnswer(name, answer);
      setSavedAnswer(answer);
      onUnsavedAnswerChange?.(unsavedAnswerId, false);
    }
  }
  function onAnswerChange(c: string) {
    setAnswer(c);
    setDraftAnswer(name, c);
    onUnsavedAnswerChange?.(
      unsavedAnswerId,
      hasUnsavedAnswerChange(c, savedAnswer, isAnswerGraded)
    );
  }
  return (
    <Box display="flex" alignItems="flex-start">
      <Box flexGrow={1}>
        {(isFrozen || isAnswerGraded) && answer ? (
          <Tooltip title={isAnswerGraded ? 'Already graded' : ''} arrow placement="top">
            <Box sx={problemDisplayStyles.frozenAnswerBox}>
              <Box sx={problemDisplayStyles.frozenAnswerLabel}>
                <Typography variant="caption" sx={problemDisplayStyles.frozenAnswerLabelText}>
                  Submitted answer
                </Typography>
              </Box>
              <Box sx={problemDisplayStyles.frozenAnswerContent}>
                <MdEditor
                  name={name}
                  editingEnabled={false}
                  placeholder={'...'}
                  value={answer}
                  onValueChange={onAnswerChange}
                />
              </Box>
              <MasterSolutionDisplay
                problemId={problemId}
                shouldShow={shouldRenderMasterSolution}
              />
            </Box>
          </Tooltip>
        ) : (
          <MdEditor
            name={name}
            editingEnabled={!isFrozen && !isAnswerGraded}
            placeholder={'...'}
            value={answer}
            onValueChange={onAnswerChange}
          />
        )}
      </Box>

      {pointsNode ? <Box sx={{ ml: 1.5, mt: 0.5, minWidth: 44 }}>{pointsNode}</Box> : null}
      <IconButton disabled={isFrozen || !canSaveAnswer} onClick={onSaveClick} sx={{ ml: 1 }}>
        <SaveIcon />
      </IconButton>
      <ShowSubProblemAnswer
        problemId={masterProblemId}
        subproblemId={problemId}
      ></ShowSubProblemAnswer>
    </Box>
  );
}

export function ProblemDisplay({
  uri,
  problem,
  isFrozen,
  r,
  showPoints = true,
  showSolution = true,
  onResponseUpdate,
  onFreezeResponse,
  renderBelowAnswerAccepter,
  hideAnswerAccepter = false,
  onUnsavedAnswerChange,
}: {
  uri?: string;
  problem: FTMLProblemWithSolution | undefined;
  isFrozen: boolean;
  r?: FTML.ProblemResponse;
  showPoints?: boolean;
  showSolution?: boolean;
  onResponseUpdate?: (r: FTML.ProblemResponse) => void;
  onFreezeResponse?: () => void;
  renderBelowAnswerAccepter?: (problemId: string, isSubProblem: boolean) => ReactNode;
  hideAnswerAccepter?: boolean;
  onUnsavedAnswerChange?: (answerId: string, hasUnsavedChanges: boolean) => void;
}) {
  const { user } = useCurrentUser();
  const userId = user?.userId ?? '';
  const problemHtml = problem?.problem.html ?? '';
  const subProblemCount = problem?.problem.subProblems?.length ?? 0;
  const [hasRenderedSubProblem, setHasRenderedSubProblem] = useState(
    () => subProblemCount > 0 || hasSubProblemsInHtml(problemHtml)
  );
  const handleSubProblemRender = useCallback(() => {
    setHasRenderedSubProblem(true);
  }, []);

  useEffect(() => {
    setHasRenderedSubProblem(subProblemCount > 0 || hasSubProblemsInHtml(problemHtml));
  }, [problemHtml, subProblemCount]);

  if (!problem) return <CircularProgress />;
  const isEffectivelyFrozen = isFrozen;

  return (
    <Card
      sx={{
        border: '1px solid #CCC',
        p: '10px',
        userSelect: 'none',
        maxWidth: '1000px',
        overflowX: 'auto',
      }}
    >
      <Box fontSize="20px">
        {showPoints && !hasRenderedSubProblem && problem.problem.total_points != null ? (
          <PointsInfo points={problem.problem.total_points} />
        ) : null}

        <ProblemViewer
          problem={problem}
          isFrozen={isEffectivelyFrozen}
          r={r}
          onResponseUpdate={onResponseUpdate}
          renderBelowAnswerAccepter={renderBelowAnswerAccepter}
          hideAnswerAccepter={hideAnswerAccepter}
          showPoints={showPoints}
          showSolution={showSolution}
          onSubProblemRender={handleSubProblemRender}
          onUnsavedAnswerChange={onUnsavedAnswerChange}
        />
        {onFreezeResponse && !isEffectivelyFrozen && (
          <Button
            disabled={!r}
            onClick={() => {
              onFreezeResponse();
              if (uri && r) handleSubmit(problem, uri, r, userId);
            }}
            variant="contained"
          >
            Submit
          </Button>
        )}
      </Box>
    </Card>
  );
}

const problemDisplayStyles = {
  frozenAnswerBox: {
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
    overflow: 'hidden',
    bgcolor: '#fff8c5',
  },
  frozenAnswerLabel: {
    px: 1.25,
    py: 0.5,
    bgcolor: 'rgba(0, 0, 0, 0.04)',
    borderBottom: '1px solid',
    borderColor: 'divider',
  },
  frozenAnswerLabelText: {
    fontWeight: 700,
    color: 'text.secondary',
  },
  frozenAnswerContent: {
    px: 1.25,
    py: 0.75,
  },
  solutionBox: {
    border: '1px solid',
    borderColor: 'success.main',
    borderRadius: 1,
    bgcolor: 'background.paper',
    mt: 0.5,
    px: 1.5,
    py: 1,
  },
  solutionLabelText: {
    display: 'block',
    fontWeight: 700,
    color: 'success.dark',
    mb: 0.75,
  },
  solutionContent: {
    color: 'text.primary',
    '& p:last-child': {
      mb: 0,
    },
  },
} as const;
