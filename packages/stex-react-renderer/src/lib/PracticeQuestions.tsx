import { FTML } from '@kwarc/ftml-viewer';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, IconButton, Tooltip } from '@mui/material';
import LinearProgress from '@mui/material/LinearProgress';
import { FTMLProblemWithSolution } from '@stex-react/api';
import { SafeHtml } from '@stex-react/react-utils';
import { useRouter } from 'next/router';
import { useEffect, useReducer, useState } from 'react';
import { handleViewSource, UriProblemViewer } from './PerSectionQuiz';
import { ProblemDisplay } from './ProblemDisplay';
import { ListStepper } from './QuizDisplay';
import { getLocaleObject } from './lang/utils';

// Corrected import path for getProblem.
// Adjust this path if the file is in a different location.
// import { getProblem } from '../../api/getProblem';

// This function is now corrected to match the ProblemResponse type.
function defaultProblemResponse(problem: FTMLProblemWithSolution): FTML.ProblemResponse {
  // Cast 'problem.problem' to 'unknown' before accessing the '@id' property.
  const problemId = (problem.problem as unknown as { '@id': string })['@id'];

  return {
    problemId: problemId ?? '',
    uri: problemId ?? '',
    points: 0,
    feedback: '',
    responses: [],
  } as FTML.ProblemResponse;
}

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

  // useEffect(() => {
  //   if (!problemUris.length) {
  //     setIsLoadingProblems(false);
  //     setProblems([]);
  //     return;
  //   }

  //   setIsLoadingProblems(true);

  //   async function fetchProblems() {
  //     const fetchedProblems: FTMLProblemWithSolution[] = [];
  //     for (const uri of problemUris) {
  //       try {
  //         // Pass the problem URI and an empty string for the second argument if needed.
  //         const problemData = await getProblem(uri, '');
  //         if (problemData) {
  //           fetchedProblems.push(problemData);
  //         }
  //       } catch (error) {
  //         console.error(`Failed to fetch problem ${uri}:`, error);
  //       }
  //     }
  //     setProblems(fetchedProblems);
  //     setResponses(fetchedProblems.map((p) => defaultProblemResponse(p)));
  //     setIsFrozen(fetchedProblems.map(() => false));
  //     setIsLoadingProblems(false);
  //   }

  //   fetchProblems();
  // }, [problemUris]);

  if (!problemUris.length) return !showButtonFirst && <i>No problems found.</i>;
  // if (isLoadingProblems) return <LinearProgress />;

  const problem = problems[problemIdx];
  const response = responses[problemIdx];

  // if (!problem || !response) return <>error</>;
  console.log({ problemUris });

  return (
    <Box>
      {problemUris.map((uri, idx) => (
        <UriProblemViewer
          key={uri}
          uri={uri}
          isSubmitted={isFrozen[idx]}
          setIsSubmitted={(v) =>
            setIsFrozen((prev) => {
              prev[idx] = v;
              return [...prev];
            })
          }
          response={responses[idx]}
          setResponse={(v) =>
            setResponses((prev) => {
              prev[idx] = v!;
              return [...prev];
            })
          }
          setQuotient={(q) => {
            console.log('Quotient for', uri, '=', q);
          }}
        />
      ))}
    </Box>
  );
}
