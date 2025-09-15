import { FTML } from '@kwarc/ftml-viewer';
import DeleteIcon from '@mui/icons-material/Delete';
import { Box, IconButton } from '@mui/material';
import { FTMLProblemWithSolution, GradingWithAnswer } from '@alea/spec';
import { GradingContext, ProblemDisplay, ShowGradingFor } from '@alea/stex-react-renderer';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
export function PeerReviewGradedItemDisplay({
  grade,
  onDelete,
}: {
  grade: GradingWithAnswer;
  onDelete: (id: number) => void;
}) {
  const [problem, setProblem] = useState<FTMLProblemWithSolution>();
  const [answerText, setAnswerText] = useState<FTML.ProblemResponse>();
  useEffect(() => {
    // TODO ALEA4-P4
    // //getLearningObjectShtml(grade.questionId).then((p) => {
    // setProblem(getProblem(p, ''));
    //});
    // setAnswerText({
    //   freeTextResponses: { [grade.subProblemId]: grade.answer },
    //   autogradableResponses: [],
    // });
  }, [grade]);
  return (
    <GradingContext.Provider
      value={{
        isGrading: false,
        showGrading: true,
        showGradingFor: ShowGradingFor.ALL,
        gradingInfo: {
          [grade.questionId]: {
            [grade.subProblemId]: [grade],
          },
        },
        studentId: grade.checkerId,
      }}
    >
      <Box>
        <ProblemDisplay
          // problemId={grade.questionId} TODO ALEA4-P4
          // showUnansweredProblems={false}
          showPoints={false}
          problem={problem}
          isFrozen={true}
          r={answerText}
          uri={grade.questionId}
        ></ProblemDisplay>
        <Box sx={{ margin: '10px' }}>
          <span>{dayjs(grade.updatedAt).fromNow()}</span>
          <IconButton
            onClick={() => onDelete(grade.id)}
            sx={{ float: 'right', display: 'inline' }}
            aria-label="delete"
            color="primary"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>
    </GradingContext.Provider>
  );
}
