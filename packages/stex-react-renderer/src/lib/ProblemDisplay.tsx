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
import { SafeFTMLFragment } from './SafeFTMLComponents';
import SaveIcon from '@mui/icons-material/Save';
import { Box, Button, Card, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { getPoints } from './stex-react-renderer';
import { ShowSubProblemAnswer } from './SubProblemAnswer';
import { useCurrentUser } from '@alea/react-utils';

export function PointsInfo({ points }: { points: number | undefined }) {
  return (
    <Typography variant="h6" sx={{ display: 'flex', justifyContent: 'flex-end' }}>
      <b>{points ?? 1} pt</b>
    </Typography>
  );
}

export const AnswerContext = createContext<Record<string, ResponseWithSubProblemId>>({});

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
}: {
  problem: FTMLProblemWithSolution;
  onResponseUpdate?: (response: FTML.ProblemResponse) => void;
  isFrozen: boolean;
  r?: FTML.ProblemResponse;
  renderBelowAnswerAccepter?: (problemId: string, isSubProblem: boolean) => ReactNode;
  hideAnswerAccepter?: boolean;
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

  const router = useRouter();
  const institutionId = router.query.institutionId as string;

  return (
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
                institutionId={institutionId}
            ></AnswerAccepter>
            ) : null}
            {renderBelowRef.current?.(problemUri, isSubProblem)}
          </Box>
        );
      }}
    />
  );
}

function AnswerAccepter({
  problemId,
  masterProblemId,
  isFrozen,
  problemTitle,
  institutionId,
}: {
  problemId: string;
  masterProblemId: string;
  isFrozen: boolean;
  problemTitle: string;
  institutionId: string;
}) {
  const previousAnswer = useContext(AnswerContext);
  const name = `answer-${problemId}`;
  let serverAnswer = '';
  let isAnswerGraded = false;
  if (previousAnswer !== undefined) {
    const previousResponse = previousAnswer[masterProblemId]?.responses?.find(
      (c) => c.subProblemId === problemId
    ) as ({ answer?: string; graded?: boolean } | undefined);
    serverAnswer = previousResponse?.answer ?? '';
    isAnswerGraded = previousResponse?.graded === true;
  }
  const initialAnswer = serverAnswer ? serverAnswer : localStorage.getItem(name) ?? '';
  const [answer, setAnswer] = useState<string>(initialAnswer);
  const [savedAnswer, setSavedAnswer] = useState<string>(initialAnswer);
  const router = useRouter();
  const canSaveAnswer = !isAnswerGraded && !!answer?.trim() && answer !== savedAnswer;

  useEffect(() => {
    const nextAnswer = serverAnswer ? serverAnswer : localStorage.getItem(name) ?? '';
    setAnswer(nextAnswer);
    setSavedAnswer(nextAnswer);
  }, [name, serverAnswer]);

  async function saveAnswer({ freeTextResponses }: { subId?: string; freeTextResponses: string }) {
    try {
      const accepted = await createAnswer({
        answer: freeTextResponses,
        questionId: masterProblemId ? masterProblemId : problemId,
        questionTitle: problemTitle,
        subProblemId: problemId ?? '',
        courseId: router.query.courseId as string,
        institutionId: institutionId,
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
    if (saved) setSavedAnswer(answer);
  }
  function onAnswerChange(c: string) {
    setAnswer(c);
    localStorage.setItem(name, c);
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

      <IconButton disabled={isFrozen || !canSaveAnswer} onClick={onSaveClick} sx={{ ml: 2 }}>
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
  onResponseUpdate,
  onFreezeResponse,
  renderBelowAnswerAccepter,
  hideAnswerAccepter = false,
}: {
  uri?: string;
  problem: FTMLProblemWithSolution | undefined;
  isFrozen: boolean;
  r?: FTML.ProblemResponse;
  showPoints?: boolean;
  onResponseUpdate?: (r: FTML.ProblemResponse) => void;
  onFreezeResponse?: () => void;
  renderBelowAnswerAccepter?: (problemId: string, isSubProblem: boolean) => ReactNode;
  hideAnswerAccepter?: boolean;
}) {
  const { user } = useCurrentUser();
  const userId = user?.userId ?? '';
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
        {showPoints && <PointsInfo points={problem.problem.total_points} />}

        <ProblemViewer
          problem={problem}
          isFrozen={isEffectivelyFrozen}
          r={r}
          onResponseUpdate={onResponseUpdate}
          renderBelowAnswerAccepter={renderBelowAnswerAccepter}
          hideAnswerAccepter={hideAnswerAccepter}
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
} as const;
