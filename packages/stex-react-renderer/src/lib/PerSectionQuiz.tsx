import { FTMLFragment, getFlamsServer } from '@kwarc/ftml-react';
import { FTML } from '@kwarc/ftml-viewer';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Button, IconButton, LinearProgress, Tooltip, Typography } from '@mui/material';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getLocaleObject } from './lang/utils';
import { getProblemState } from './ProblemDisplay';
import { ListStepper } from './QuizDisplay';

export function handleViewSource(problemUri: string) {
  getFlamsServer()
    .sourceFile({ uri: problemUri })
    .then((sourceLink) => {
      if (sourceLink) window.open(sourceLink, '_blank');
    });
}

export function UriProblemViewer({
  uri,
  isSubmitted = false,
  setIsSubmitted,
  response,
  setResponse,
  setQuotient,
}: {
  uri: string;
  isSubmitted?: boolean;
  setIsSubmitted?: (isSubmitted: boolean) => void;
  response?: FTML.ProblemResponse;
  setResponse?: (response: FTML.ProblemResponse | undefined) => void;
  setQuotient?: (quotient: number | undefined) => void;
}) {
  const [solution, setSolution] = useState<string | undefined>(undefined);

  useEffect(() => {
    setSolution(undefined);
    getFlamsServer().solution({ uri }).then(setSolution);
  }, [uri]);

  useEffect(() => {
    const state = getProblemState(isSubmitted, solution, response);
    if (state.type === 'Graded') {
      setQuotient?.(state.feedback?.score_fraction);
    }
  }, [isSubmitted, response, solution]);

  const problemState = getProblemState(isSubmitted, solution, response);
  return (
    <Box fragment-uri={uri} fragment-kind="Problem">
      <FTMLFragment
        key={`${uri}-${problemState.type}`}
        fragment={{ type: 'FromBackend', uri }}
        allowHovers={isSubmitted}
        problemStates={new Map([[uri, problemState]])}
        onProblem={(response) => {
          setResponse?.(response);
        }}
      />
      {setIsSubmitted && (
        <Button onClick={() => setIsSubmitted(true)} disabled={isSubmitted} variant="contained">
          Submit
        </Button>
      )}
    </Box>
  );
}

export function PerSectionQuiz({
  sectionUri,
  showButtonFirst = true,
  showHideButton = false,
  cachedProblemUris,
  setCachedProblemUris,
  category,
  courseId,
}: {
  sectionUri: string;
  showButtonFirst?: boolean;
  showHideButton?: boolean;
  cachedProblemUris?: string[] | null;
  setCachedProblemUris?: (uris: string[]) => void;
  category?: 'syllabus' | 'adventurous';
  courseId?: string;
}) {
  const t = getLocaleObject(useRouter()).quiz;
  const [problemUris, setProblemUris] = useState<string[]>(cachedProblemUris || []);
  const [isLoadingProblemUris, setIsLoadingProblemUris] = useState<boolean>(!cachedProblemUris);
  const [responses, setResponses] = useState<(FTML.ProblemResponse | undefined)[]>([]);
  const [problemIdx, setProblemIdx] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState<boolean[]>([]);
  const [show, setShow] = useState(true);
  const [showSolution, setShowSolution] = useState(false);
  const [startQuiz, setStartQuiz] = useState(!showButtonFirst);

  useEffect(() => {
    if (cachedProblemUris) return;
    //  if (!sectionUri) return;
    setIsLoadingProblemUris(true);
    axios
      .get(
        `/api/get-problems-by-section?sectionUri=${encodeURIComponent(
          sectionUri
        )}&courseId=${courseId}`
      )
      .then((resp) => {
        const filtered = resp.data
          .filter((p: any) => !category || p.category === category)
          .map((p: any) => p.problemId);

        setProblemUris(filtered);
        if (setCachedProblemUris) {
          setCachedProblemUris(filtered);
        }
        setIsLoadingProblemUris(false);
        setIsSubmitted(filtered.map(() => false));
        setResponses(filtered.map(() => undefined));
      }, console.error);
  }, [sectionUri, cachedProblemUris, setCachedProblemUris, category]);

  if (isLoadingProblemUris) return <LinearProgress />;
  if (!problemUris.length) {
    return (
      <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
        {t.NoPracticeProblemsAll}
      </Typography>
    );
  }

  if (!startQuiz) {
    return (
      <Button onClick={() => setStartQuiz(true)} variant="contained">
        {t.perSectionQuizButton.replace('$1', problemUris.length.toString())}
      </Button>
    );
  }

  if (!show) {
    return (
      <Button onClick={() => setShow(true)} variant="contained">
        {t.perSectionQuizButton.replace('$1', problemUris.length.toString())}
      </Button>
    );
  }

  const problemUri = problemUris[problemIdx];
  // TODO ALEA4-P3 const response = responses[problemIdx];
  // const solutions = problems[problemIdx]?.subProblemData?.map((p) => p.solution);

  if (!problemUri) return <>error: [{problemUri}] </>;

  return (
    <Box
      px={1}
      maxWidth="800px"
      m="auto"
      bgcolor="white"
      border="1px solid #CCC"
      borderRadius="5px"
    >
      <Typography fontWeight="bold" textAlign="left">
        {`${t.problem} ${problemIdx + 1} ${t.of} ${problemUris.length} `}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <ListStepper
          idx={problemIdx}
          listSize={problemUris.length}
          onChange={(idx) => {
            setProblemIdx(idx);
            setShowSolution(false);
          }}
        />
        <IconButton onClick={() => handleViewSource(problemUri)} sx={{ float: 'right' }}>
          <Tooltip title="view source">
            <OpenInNewIcon />
          </Tooltip>
        </IconButton>
      </Box>
      <Box mb="10px">
        <UriProblemViewer
          key={problemUri}
          uri={problemUri}
          isSubmitted={isSubmitted[problemIdx]}
          setIsSubmitted={(v) =>
            setIsSubmitted((prev) => {
              prev[problemIdx] = v;
              return [...prev];
            })
          }
          response={responses[problemIdx]}
          setResponse={(v) =>
            setResponses((prev) => {
              prev[problemIdx] = v;
              return [...prev];
            })
          }
        />
        {/* TODO ALEA4-P3
        <ProblemDisplay
          r={response}
          uri={problemUris[problemIdx]}
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
        />*/}
      </Box>
      <Box
        mb={2}
        sx={{ display: 'flex', gap: '10px', flexDirection: 'column', alignItems: 'flex-start' }}
      >
        {/* TODO ALEA4-P3 solutions?.length > 0 && (
          <Button variant="contained" onClick={() => setShowSolution(!showSolution)}>
            {showSolution ? t.hideSolution : t.showSolution}
          </Button>
        )}*/}
        {showSolution && (
          <Box mb="10px">
            {/* solutions.map((solution) => (
              <div style={{ color: '#555' }} dangerouslySetInnerHTML={{__html:solution}}></div>
            ))*/}
          </Box>
        )}
        {showHideButton && (
          <Button onClick={() => setShow(false)} variant="contained" color="secondary">
            {t.hideProblems}
          </Button>
        )}
      </Box>
    </Box>
  );
}
