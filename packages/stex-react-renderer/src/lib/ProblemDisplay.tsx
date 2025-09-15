import { FTMLFragment } from '@kwarc/ftml-react';
import { FTML } from '@kwarc/ftml-viewer';
import SaveIcon from '@mui/icons-material/Save';
import { Box, Button, Card, CircularProgress, IconButton, Typography } from '@mui/material';
import {
  AnswerUpdateEntry,
  FTMLProblemWithSolution,
  ProblemAnswerEvent,
  ResponseWithSubProblemId,
  UserInfo,
  createAnswer,
  getUserInfo,
  postAnswerToLMP,
} from '@alea/spec';
import { MystEditor } from '@alea/myst';
import { useRouter } from 'next/router';
import { createContext, useContext, useEffect, useState } from 'react';
import { getPoints } from './stex-react-renderer';
import { ShowSubProblemAnswer, SubProblemAnswer } from './SubProblemAnswer';

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
  objectives: [FTML.CognitiveDimension, FTML.SymbolURI][] | undefined,
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
  if (!isFrozen) return { type: 'Interactive', current_response };
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
}: {
  problem: FTMLProblemWithSolution;
  onResponseUpdate?: (response: FTML.ProblemResponse) => void;
  isFrozen: boolean;
  r?: FTML.ProblemResponse;
}) {
  const problemState = getProblemState(isFrozen, problem.solution, r);
  const { html, uri } = problem.problem;
  const isHaveSubProblems = problem.problem.subProblems != null;
  const problemStates = new Map([[uri, problemState]]);
  problem.problem?.subProblems?.forEach((c) => {
    problemStates.set(c.id, getProblemState(isFrozen, c.solution, r));
  });  
  const isNap=problem.problem.html.includes(`data-ftml-autogradable="true"`);
  return (
    <FTMLFragment
      key={uri}
      fragment={{ type: 'HtmlString', html, uri }}
      allowHovers={isFrozen}
      problemStates={problemStates}
      onProblem={(response) => {
        onResponseUpdate?.(response);
      }}
      {...(!isNap?{onFragment:(problemId, kind) => {
        if (kind.type === 'Problem') {
          return (ch: React.ReactNode) => (
            <Box>
              {ch}
              <AnswerAccepter
                masterProblemId={uri}
                isHaveSubProblems={isHaveSubProblems}
                problemTitle={problem.problem.title_html ?? ''}
                isFrozen={isFrozen}
                problemId={problemId}
              ></AnswerAccepter>
            </Box>
          );
        }
      }}:{}) }
    />
  );
}

function AnswerAccepter({
  problemId,
  masterProblemId,
  isHaveSubProblems,
  isFrozen,
  problemTitle,
}: {
  problemId: string;
  masterProblemId: string;
  isHaveSubProblems: boolean;
  isFrozen: boolean;
  problemTitle: string;
}) {
  const previousAnswer = useContext(AnswerContext);
  const name = `answer-${problemId}`;
  const serverAnswer =
    previousAnswer[masterProblemId]?.responses?.find((c) => c.subProblemId === problemId)?.answer ??
    null;
  const [answer, setAnsewr] = useState<string>(
    serverAnswer ? serverAnswer : localStorage.getItem(name) ?? ''
  );
  const subId = isHaveSubProblems ? +problemId.charAt(problemId.length - 1) : 0;
  const router = useRouter();

  async function saveAnswer({
    subId,
    freeTextResponses,
  }: {
    subId?: string;
    freeTextResponses: string;
  }) {
    try {
      createAnswer({
        answer: freeTextResponses,
        questionId: masterProblemId ? masterProblemId : problemId,
        questionTitle: problemTitle,
        subProblemId: subId ?? '',
        courseId: router.query.courseId as string,
        homeworkId: +(router.query.id ?? 0),
      });
      console.log('All answers saved successfully!');
    } catch (error) {
      console.error('Error saving answers:', error);
      alert('Failed to save answers. Please try again.');
    }
  }
  if (isHaveSubProblems && isNaN(subId)) return;
  async function onSaveClick() {
    await saveAnswer({ freeTextResponses: answer, subId: problemId });
  }
  function onAnswerChange(c: string) {
    setAnsewr(c);
    localStorage.setItem(name, c);
  }
  return (
    <Box display="flex" alignItems="flex-start">
      <Box flexGrow={1}>
        <MystEditor
          name={name}
          editingEnabled={!isFrozen}
          placeholder={'...'}
          value={answer}
          onValueChange={onAnswerChange}
        />
      </Box>

      <IconButton disabled={isFrozen} onClick={onSaveClick} sx={{ ml: 2 }}>
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
}: {
  uri?: string;
  problem: FTMLProblemWithSolution | undefined;
  isFrozen: boolean;
  r?: FTML.ProblemResponse;
  showPoints?: boolean;
  onResponseUpdate?: (r: FTML.ProblemResponse) => void;
  onFreezeResponse?: () => void;
}) {
  const [userId, setUserId] = useState('');
  useEffect(() => {
    getUserInfo().then((u: UserInfo | undefined) => {
      if (u) {
        setUserId(u.userId as string);
      }
    });
  }, []);
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
        />
        {onFreezeResponse && !isEffectivelyFrozen && r && (
          <Button
            onClick={() => {
              onFreezeResponse();
              if (uri) handleSubmit(problem, uri, r, userId);
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
