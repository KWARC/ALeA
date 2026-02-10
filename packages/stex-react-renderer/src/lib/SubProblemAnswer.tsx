import { Box, IconButton, Typography } from '@mui/material';

import { Cancel } from '@mui/icons-material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import SaveIcon from '@mui/icons-material/Save';
import {
  CreateAnswerClassRequest,
  GradingInfo,
  Problem,
  ReviewType,
  SubProblemData,
} from '@alea/spec';
import { MdEditor, MdViewer } from '@alea/markdown';
import { localStore } from '@alea/utils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useRouter } from 'next/router';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getLocaleObject } from './lang/utils';
import { ListStepper } from './QuizDisplay';

dayjs.extend(relativeTime);

interface GradingContextType {
  isGrading: boolean;
  showGrading: boolean;
  showGradingFor: ShowGradingFor;
  studentId: string;
  gradingInfo: Record<string, Record<string, GradingInfo[]>>; // problemId -> (subProblemId -> gradingInfo)
  onNewGrading?: (
    subProblemId: string,
    acs: CreateAnswerClassRequest[],
    feedback: string
  ) => Promise<void>;
  onNextGradingItem?: () => void; // Marked as optional
  onPrevGradingItem?: () => void;
}
export enum ShowGradingFor {
  ALL,
  INSTRUCTOR,
  SELF,
  PEER,
}
export const GradingContext = createContext<GradingContextType>({
  isGrading: false,
  showGrading: false,
  showGradingFor: ShowGradingFor.INSTRUCTOR,
  studentId: '',
  gradingInfo: {},
});

export function getAnswerFromLocalStorage(questionId: string, subProblemId: string) {
  return localStore?.getItem(`answer-${questionId}-${subProblemId}`);
}

export function saveAnswerToLocalStorage(questionId: string, subProblemId: string, answer: string) {
  localStore?.setItem(`answer-${questionId}-${subProblemId}`, answer);
}

export function GradingDisplay({
  gradingInfo,
  showGraderInformation = true,
}: {
  gradingInfo: GradingInfo;
  showGraderInformation?: boolean;
}) {
  return (
    <Box mt={1}>
      <i>Score: </i> {gradingInfo?.totalPoints}
      {/* /gradingInfo.maxPoints*/}
      {gradingInfo.customFeedback && (
        <Box sx={{ bgcolor: '#CCC', px: '3px', borderRadius: '3px', fontSize: 'medium' }}>
          <MdViewer content={'**Feedback:**\n\n ' + gradingInfo.customFeedback} />
        </Box>
      )}
      <Box sx={{ border: '1px solid #333', borderRadius: 1, p: 1 }}>
        <Typography sx={{ fontStyle: 'medium', fontWeight: 'bold' }}>
          <b>Details:</b>
        </Typography>
        {gradingInfo.answerClasses.map((c) => {
          const effectNum = c.points * (c.isTrait && c.count > 1 ? c.count : 1);
          const effectStr = effectNum > 0 ? `+${effectNum}` : effectNum;
          return (
            <Box my={0.5} fontSize="small">
              {c.description ?? c.title}: <b>({effectStr})</b>
            </Box>
          );
        })}
      </Box>
      <i>
        {showGraderInformation
          ? gradingInfo.reviewType === 'SELF'
            ? 'Self Graded'
            : `Graded by: ${gradingInfo.checkerId} (${gradingInfo.reviewType})`
          : `${gradingInfo.reviewType}`}
      </i>
    </Box>
  );
}

export function GradingManager({
  problemId,
  subProblemId,
}: {
  problemId: string;
  subProblemId: string;
}) {
  const { isGrading, showGrading, gradingInfo: g, showGradingFor } = useContext(GradingContext);
  const gradingInfo = useMemo(() => {
    // const allGradings = g?.[problemId]?.[subProblemId] ?? [];
    const allGradings: GradingInfo[] = [];
    return isGrading
      ? allGradings
      : allGradings.filter((c) => {
          if (
            showGradingFor === ShowGradingFor.INSTRUCTOR &&
            c.reviewType === ReviewType.INSTRUCTOR
          )
            return c;
          if (showGradingFor === ShowGradingFor.PEER && c.reviewType === ReviewType.PEER) return c;
          if (showGradingFor === ShowGradingFor.SELF && c.reviewType === ReviewType.SELF) return c;
          return c;
        });
  }, [g, problemId, subProblemId]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedGradingIdx, setSelectedGradingIdx] = useState(0);

  useEffect(() => {
    if (!gradingInfo?.length) {
      setIsCreatingNew(isGrading);
    } else {
      setIsCreatingNew(false);
    }

    setSelectedGradingIdx(0);
  }, [gradingInfo, subProblemId, isGrading]);

  if (!isGrading && !showGrading) return null;
  if (isCreatingNew) {
    return (
      <>
        <IconButton onClick={() => setIsCreatingNew(false)}>
          <Cancel />
        </IconButton>
        {/* <GradingCreator subProblemId={subProblemId} rawAnswerClasses={[]} /> */}
      </>
    );
  }

  return (
    <Box>
      {isGrading && (
        <IconButton onClick={() => setIsCreatingNew(true)}>
          <FiberNewIcon />
        </IconButton>
      )}
      {showGrading && !!gradingInfo?.length && (
        <Box>
          <ListStepper
            idx={selectedGradingIdx}
            listSize={gradingInfo.length}
            onChange={setSelectedGradingIdx}
          />
          <GradingDisplay gradingInfo={gradingInfo[selectedGradingIdx]} />
        </Box>
      )}
    </Box>
  );
}

export function SubProblemAnswer({
  problem,
  subProblem,
  questionId,
  subProblemId,
  isFrozen,
  existingResponse,
  onSaveClick,
}: {
  problem: Problem;
  subProblem: SubProblemData;
  questionId: string;
  subProblemId: string;
  isFrozen?: boolean;
  existingResponse?: string;
  onSaveClick: () => void;
}) {
  const router = useRouter();
  const t = getLocaleObject(router).quiz;
  const [answer, setAnswer] = useState('');
  const canSaveAnswer = !!answer?.trim() && answer !== existingResponse;
  const canDiscardAnswer = answer !== existingResponse;
  const { isGrading, showGrading, studentId, onPrevGradingItem, onNextGradingItem } =
    useContext(GradingContext);

  useEffect(() => {
    if (isFrozen || isGrading) {
      setAnswer(existingResponse ?? '');
      return;
    }
    const fromLocalStore = getAnswerFromLocalStorage(questionId, subProblemId);
    if (!fromLocalStore && existingResponse) {
      saveAnswerToLocalStorage(questionId, subProblemId, existingResponse);
    }
    setAnswer(fromLocalStore ?? existingResponse ?? '');
  }, [questionId, subProblemId, existingResponse]);

  function onAnswerChanged(value: string): void {
    saveAnswerToLocalStorage(questionId, subProblemId, value);
    setAnswer(value);
  }

  const solutionBox =
    isFrozen && subProblem.solution ? (
      <Box
        sx={{
          color: 'text.secondary',
          bgcolor: 'background.paper',
          p: '5px',
          borderRadius: '5px',
          my: '10px',
          border: 1,
          borderColor: 'primary.main',
        }}
      >
        {/*mmtHTMLToReact(subProblem.solution.replace(MMT_CUSTOM_ID_PREFIX, ''))*/}
        TODO ALEA4-P4
      </Box>
    ) : (
      <></>
    );
  return (
    <>
      <Box component="span" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
        {problem?.subProblemData?.length === 1
          ? t.yourAnswer
          : t.yourAnswerWithIdx
              .replace('$1', (Number(subProblemId) + 1).toString())
              .replace('$2', problem?.subProblemData?.length.toString())}
      </Box>
      <Box>
        {isGrading && solutionBox}
        {isFrozen ? (
          <Box
            sx={{
              border: `2px solid gray`,
              paddingLeft: '10px',
              margin: '5px 0px',
              backgroundColor: '#d3d3d3',
              borderRadius: '5px',
            }}
          >
            <MdViewer content={answer || '*Unanswered*'} />
          </Box>
        ) : (
          <Box display="flex" alignItems="flex-start">
            <Box flexGrow={1}>
              <MdEditor
                name={`answer-${questionId}-${subProblemId}`}
                placeholder={'...'}
                value={answer}
                onValueChange={onAnswerChanged}
                editorProps={canSaveAnswer ? { border: '2px solid red' } : undefined}
              />
            </Box>
            <IconButton
              disabled={!canSaveAnswer}
              onClick={onSaveClick}
              sx={{ color: 'primary.main', ml: 2 }}
            >
              <SaveIcon />
            </IconButton>
            <IconButton
              disabled={!canDiscardAnswer}
              onClick={() => {
                const prompt = existingResponse
                  ? 'Are you sure you want to discard unsaved changes to your answer?'
                  : 'Are you sure you want to discard your answer?';
                if (!confirm(prompt)) return;
                onAnswerChanged(existingResponse ?? '');
              }}
              sx={{ color: 'red' }}
            >
              <DeleteForeverIcon />
            </IconButton>
          </Box>
        )}
      </Box>
      {(isGrading || showGrading) && (
        <Box p={1} bgcolor="white" border="1px solid gray" borderRadius={1}>
          <Typography display="block">
            {isGrading && (
              <>
                Grading for <b>{studentId}</b>
              </>
            )}
            {onPrevGradingItem && (
              <IconButton onClick={() => onPrevGradingItem()}>
                <ArrowBackIosIcon />
              </IconButton>
            )}
            {onNextGradingItem && (
              <IconButton onClick={() => onNextGradingItem()}>
                <ArrowForwardIosIcon />
              </IconButton>
            )}
          </Typography>
          <GradingManager problemId={questionId} subProblemId={subProblemId} />
        </Box>
      )}
      {!isGrading && solutionBox}
    </>
  );
}
export function ShowSubProblemAnswer({
  problemId,
  subproblemId,
}: {
  problemId: string;
  subproblemId: string;
}) {
  const { showGrading, gradingInfo: g, showGradingFor } = useContext(GradingContext);
  if (!showGrading) return <></>;
  const gradingInfo = g?.[problemId]?.[subproblemId]?.filter((c) => {
    if (showGradingFor === ShowGradingFor.INSTRUCTOR && c.reviewType === ReviewType.INSTRUCTOR)
      return c;
    if (showGradingFor === ShowGradingFor.PEER && c.reviewType === ReviewType.PEER) return c;
    if (showGradingFor === ShowGradingFor.SELF && c.reviewType === ReviewType.SELF) return c;
    return c;
  });
  return (
    <Box>{showGrading ? gradingInfo?.map((c) => <GradingDisplay gradingInfo={c} />) : <></>}</Box>
  );
}
