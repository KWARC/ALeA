import { FTML } from '@flexiformal/ftml';
import DeleteIcon from '@mui/icons-material/Delete';
import { Box, IconButton } from '@mui/material';
import { contentFragment } from '@flexiformal/ftml-backend';
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
    let isMounted = true;
    async function loadProblem() {
      try {
        const fragmentResponse: any[] = await contentFragment({ uri: grade.questionId });
        if (!isMounted) return;
        setProblem({
          problem: {
            uri: grade.questionId,
            html: fragmentResponse?.[2] || '',
            title_html: fragmentResponse?.[1] || '',
          },
          answerClasses: [],
        });
        const responses = [] as FTML.ProblemResponse['responses'];
        const subProblemIdx = Number(grade.subProblemId);
        if (Number.isFinite(subProblemIdx)) {
          responses[subProblemIdx] = {
            type: 'Fillinsol',
            value: grade.answer,
          };
        }
        setAnswerText({
          uri: grade.questionId,
          responses,
        });
      } catch (error) {
        console.error('Error fetching peer-review problem:', error);
      }
    }
    loadProblem();
    return () => {
      isMounted = false;
    };
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
