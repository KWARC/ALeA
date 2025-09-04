import { FTML } from '@kwarc/ftml-viewer';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, IconButton, Tooltip } from '@mui/material';
import LinearProgress from '@mui/material/LinearProgress';
import { FTMLProblemWithSolution } from '@stex-react/spec';
import { SafeHtml } from '@stex-react/react-utils';
import { useRouter } from 'next/router';
import { useEffect, useReducer, useState } from 'react';
import { handleViewSource } from './PerSectionQuiz';
import { ProblemDisplay } from './ProblemDisplay';
import { ListStepper } from './QuizDisplay';
import { getLocaleObject } from './lang/utils';

function SourceIcon({ problemUri }: { problemUri: string }) {
  return (
    <IconButton onClick={() => handleViewSource(problemUri)}>
      <Tooltip title="view source">
        <OpenInNewIcon />
      </Tooltip>
    </IconButton>
  );
}
export function PracticeQuestions({
  problemIds: problemUris,
  showButtonFirst = true,
}: {
  problemIds: string[];
  showButtonFirst?: boolean;
}) {
  const t = getLocaleObject(useRouter()).quiz;
  const [problems, setProblems] = useState<FTMLProblemWithSolution[]>([]);
  const [isLoadingProblems, setIsLoadingProblems] = useState<boolean>(true);
  const [responses, setResponses] = useState<FTML.ProblemResponse[]>([]);
  const [problemIdx, setProblemIdx] = useState(0);
  const [isFrozen, setIsFrozen] = useState<boolean[]>([]);
  const [, forceRerender] = useReducer((x) => x + 1, 0);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    // TODO ALEA4-P3
    /*
    const problems = problemStrs.map((p) => getProblem(p, ''));
    setIsLoadingProblems(true);
    const problems$ =  problemUris.map((p) => getLearningObjectShtml( p));
    Promise.all(problems$).then((problemStrs) => {
      // setProblems(problems);
      // setResponses(problems.map((p) => defaultProblemResponse(p)));
      setIsFrozen(problems.map(() => false));
      setIsLoadingProblems(false);
    });*/
  }, [problemUris]);

  if (!problemUris.length) return !showButtonFirst && <i>No problems found.</i>;
  if (isLoadingProblems) return <LinearProgress />;

  const problem = problems[problemIdx];
  const response = responses[problemIdx];
  // const subProblems = problems[problemIdx]?.subProblemData;

  if (!problem || !response) return <>error</>;

  return (
    <Box
      px="10px"
      maxWidth="800px"
      m="auto"
      bgcolor="white"
      border="1px solid #CCC"
      borderRadius="5px"
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <h2>
          {problems.length > 1 ? (
            <>
              {t.problem} {problemIdx + 1} {t.of} {problems.length}&nbsp;
            </>
          ) : (
            <SourceIcon problemUri={problemUris[problemIdx]} />
          )}
          {problem.problem.title_html && <SafeHtml html={problem.problem.title_html} />}
        </h2>
      </Box>
      {problems.length > 1 && (
        <Box display="flex" justifyContent="space-between">
          <ListStepper
            idx={problemIdx}
            listSize={problems.length}
            onChange={(idx) => {
              setProblemIdx(idx);
              setShowSolution(false);
            }}
          />
          <IconButton onClick={() => handleViewSource(problemUris[problemIdx])}>
            <Tooltip title="view source">
              <OpenInNewIcon />
            </Tooltip>
          </IconButton>
        </Box>
      )}
      <Box mb="10px">
        <ProblemDisplay
          r={response}
          showPoints={false}
          problem={problem}
          isFrozen={isFrozen[problemIdx]}
          onResponseUpdate={(response) => {
            forceRerender();
            setResponses((prev) => {
              prev[problemIdx] = response;
              return prev;
            });
          }}
          onFreezeResponse={() =>
            setIsFrozen((prev) => {
              prev[problemIdx] = true;
              return [...prev];
            })
          }
        />
      </Box>
      <Box
        mb={2}
        sx={{ display: 'flex', gap: '10px', flexDirection: 'column', alignItems: 'flex-start' }}
      >
        {/* TODO ALEA4-P4 subProblems?.length > 0 && (
          <Button variant="contained" onClick={() => setShowSolution(!showSolution)}>
            {showSolution ? t.hideSolution : t.showSolution}
          </Button>
        )}*/}
        {showSolution && (
          <Box mb="10px">
            {/* subProblems.map((p) => (
              <div style={{ color: '#555' }}>{mmtHTMLToReact(p.solution)}</div>
            ))*/}
            TODO ALEA4-P4
          </Box>
        )}
      </Box>
    </Box>
  );
}
