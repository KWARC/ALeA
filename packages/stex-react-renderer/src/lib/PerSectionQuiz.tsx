import { FTMLFragment, getFlamsServer } from '@kwarc/ftml-react';
import { FTML } from '@kwarc/ftml-viewer';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FilterList from '@mui/icons-material/FilterList';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Popover,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { getLocaleObject } from './lang/utils';
import { getProblemState } from './ProblemDisplay';
import { ListStepper } from './QuizDisplay';
import { getProblemsPerSection } from '@stex-react/api';
import { ForMe } from './ForMe';
import { ProblemFilter } from './ProblemFilter';

export function handleViewSource(problemUri: string) {
  getFlamsServer()
    .sourceFile({ uri: problemUri })
    .then((sourceLink) => {
      if (sourceLink) window.open(sourceLink, '_blank');
    });
}

export function getProblemType(uri: string): 'quiz' | 'homework' | 'exam' | 'uncategorized' {
  if (uri.includes('/assignments')) return 'homework';
  if (uri.includes('/hwexam')) return 'exam';
  if (uri.includes('/quiz') || uri.includes('&e=quiz')) return 'quiz';
  return 'uncategorized';
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
  const [tabIndex, setTabIndex] = useState<string>('0');
  const [categoryMap, setCategoryMap] = useState<Record<string, string[]>>({});
  const [allProblemUris, setAllProblemUris] = useState<string[]>([]);
  const [formeUris, setFormeUris] = useState<string[] | null>(null);
  const orderedCategoryKeys = useMemo(() => {
    const knownOrder = ['syllabus', 'adventurous'];
    const rest = Object.keys(categoryMap).filter((cat) => !knownOrder.includes(cat));
    return [...knownOrder.filter((k) => categoryMap[k]), ...rest];
  }, [categoryMap]);

  useEffect(() => {
    if (cachedProblemUris?.length) {
      setProblemUris(cachedProblemUris);
      setIsSubmitted(cachedProblemUris.map(() => false));
      setResponses(cachedProblemUris.map(() => undefined));
      setAllProblemUris(cachedProblemUris);
      return;
    }

    setIsLoadingProblemUris(true);

    getProblemsPerSection(sectionUri, courseId)
      .then((problems) => {
        const map: Record<string, string[]> = {};

        problems.forEach(({ problemId, category }) => {
          const cat = category || 'uncategorized';
          if (!map[cat]) map[cat] = [];
          map[cat].push(problemId);
        });

        setCategoryMap(map);
        const selected: string[] = (category && map[category]) || map[Object.keys(map)[0]] || [];
        setCachedProblemUris?.(selected);
        setTabIndex('0');

        setAllProblemUris(selected);
        setProblemUris(selected);
        setIsSubmitted(selected.map(() => false));
        setResponses(selected.map(() => undefined));
      })
      .catch((err) => {
        console.error('Error loading problems', err);
      })
      .finally(() => setIsLoadingProblemUris(false));
  }, [sectionUri, courseId]);

  if (isLoadingProblemUris) return <LinearProgress />;

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

  // if (!problemUri) return <>error: [{problemUri}] </>;

  return (
    <Box mb={4}>
      {/* {!problemUris.length ? (
        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
          {t.NoPracticeProblemsAll}
        </Typography>
      ) : (
        (() => { */}
      {/* const problemUri = problemUris[problemIdx]; */}
      <Box
        px={2}
        maxWidth="800px"
        m="auto"
        bgcolor="white"
        border="1px solid #CCC"
        borderRadius="5px"
      >
        {/* <Typography fontWeight="bold" textAlign="left">
          {`${t.problem} ${problemIdx + 1} ${t.of} ${problemUris.length} `}
        </Typography> */}
        {!category && Object.keys(categoryMap).length > 0 && (
          <Tabs
            value={tabIndex}
            onChange={(_, newVal: string) => {
              if (newVal === 'forme') {
                setTabIndex('forme');
                return;
              }

              const index = parseInt(newVal);
              const selectedCategory = orderedCategoryKeys[index];
              const selected = categoryMap[selectedCategory] || [];

              setTabIndex(newVal);
              setAllProblemUris(selected);
              setProblemUris(selected);
              setIsSubmitted(selected.map(() => false));
              setResponses(selected.map(() => undefined));
              setProblemIdx(0);
            }}
          >
            <Tab value="forme" label="For Me" />
            {orderedCategoryKeys.map((cat, i) => (
              <Tab
                key={cat}
                value={i.toString()}
                label={
                  cat === 'adventurous'
                    ? "I'm Adventurous"
                    : cat === 'syllabus'
                    ? 'Syllabus'
                    : cat[0].toUpperCase() + cat.slice(1)
                }
              />
            ))}
          </Tabs>
        )}
        {tabIndex === 'forme' ? (
          <ForMe
            sectionUri={sectionUri}
            cachedProblemUris={formeUris}
            setCachedProblemUris={setFormeUris}
            disablelayout={true}
            setExternalProblemUris={(uris) => {
              if (
                uris.length === problemUris.length &&
                uris.every((u, i) => u === problemUris[i])
              ) {
                return;
              }
              setProblemUris(uris);
              setIsSubmitted(uris.map(() => false));
              setResponses(uris.map(() => undefined));
              setProblemIdx(0);
            }}
          />
        ) : (
          <>
            <ProblemFilter
              allProblemUris={allProblemUris}
              onApply={(filtered, type) => {
                setProblemUris(filtered);
                setIsSubmitted(filtered.map(() => false));
                setResponses(filtered.map(() => undefined));
                setProblemIdx(0);
              }}
            />
            {!problemUris.length ? (
              <Typography
                variant="body2"
                sx={{ fontStyle: 'italic', color: 'text.secondary', mt: 2 }}
              >
                {t.NoPracticeProblemsAll}
              </Typography>
            ) : (
              <>
                <Typography fontWeight="bold" textAlign="left">
                  {`${t.problem} ${problemIdx + 1} ${t.of} ${problemUris.length} `}
                </Typography>
                <Box
                  px={2}
                  maxWidth="800px"
                  m="auto"
                  bgcolor="white"
                  border="1px solid #CCC"
                  borderRadius="5px"
                ></Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
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
                <Box mb="14px">
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
                  mb={6}
                  sx={{
                    display: 'flex',
                    gap: '10px',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  }}
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
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
