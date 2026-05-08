import { FTML } from '@flexiformal/ftml';
import DeleteIcon from '@mui/icons-material/Delete';
import { Box, IconButton } from '@mui/material';
import { contentFragment } from '@flexiformal/ftml-backend';
import { FTMLProblemWithSolution, GradingWithAnswer } from '@alea/spec';
import { GradingContext, ProblemDisplay, ShowGradingFor } from '@alea/stex-react-renderer';
import { parseContentFragmentTuple } from '@alea/quiz-utils';
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
        const fragmentResponse = await contentFragment({ uri: grade.questionId });
        if (!isMounted) return;
        const { titleHtml, html } = parseContentFragmentTuple(fragmentResponse);
        setProblem({
          problem: {
            uri: grade.questionId,
            html,
            title_html: titleHtml,
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
      } catch {
        if (!isMounted) return;
        setProblem(undefined);
        setAnswerText(undefined);
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
        <Box sx={{ margin: '10px', display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton onClick={() => onDelete(grade.id)} aria-label="delete" color="primary">
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>
    </GradingContext.Provider>
  );
}
