import { FTMLFragment, getFlamsServer } from '@kwarc/ftml-react';
import { FTML } from '@kwarc/ftml-viewer';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Box,
  Button,
  IconButton,
  LinearProgress,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { getProblemsPerSection, getUserProfile, ProblemData } from '@stex-react/spec';
import { getParamFromUri } from '@stex-react/utils';
import Router, { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { ForMe } from './ForMe';
import { getLocaleObject } from './lang/utils';
import { getProblemState } from './ProblemDisplay';
import { ProblemFilter } from './ProblemFilter';
import { ListStepper } from './QuizDisplay';

const commonTooltipSlotProps = {
  popper: {
    sx: {
      '& .MuiTooltip-tooltip': {
        backgroundColor: '#fff',
        color: '#000',
        border: '1px solid #000',
        fontSize: '0.85rem',
      },
    },
  },
};

const commonIconStyles = {
  marginLeft: '8px',
  fontSize: 18,
  verticalAlign: 'middle' as const,
  cursor: 'pointer',
};

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
  tabIndex: externalTabIndex,
  setTabIndex: setExternalTabIndex,
  externalCategoryMap,
  setExternalCategoryMap,
}: {
  sectionUri: string;
  showButtonFirst?: boolean;
  showHideButton?: boolean;
  cachedProblemUris?: string[] | null;
  setCachedProblemUris?: (uris: string[]) => void;
  category?: 'syllabus' | 'adventurous';
  courseId: string;
  tabIndex?: string;
  setTabIndex?: (val: string) => void;
  externalCategoryMap?: Record<string, string[]>;
  setExternalCategoryMap?: (map: Record<string, string[]>) => void;
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
  const [localTabIndex, setLocalTabIndex] = useState<string>('0');
  const tabIndex = externalTabIndex ?? localTabIndex;
  const setTabIndex = setExternalTabIndex ?? setLocalTabIndex;
  const [localCategoryMap, setLocalCategoryMap] = useState<Record<string, string[]>>({});
  const categoryMap = externalCategoryMap ?? localCategoryMap;
  const setCategoryMap = setExternalCategoryMap ?? setLocalCategoryMap;
  const [problems, setProblems] = useState<ProblemData[]>([]);
  const [allProblemUris, setAllProblemUris] = useState<string[]>([]);
  const [formeUris, setFormeUris] = useState<string[] | null>(null);
  const orderedCategoryKeys = useMemo(() => {
    const knownOrder = ['syllabus', 'adventurous'];
    const rest = Object.keys(categoryMap).filter((cat) => !knownOrder.includes(cat));
    return [...knownOrder, ...rest];
  }, [categoryMap]);

  useEffect(() => {
    if (cachedProblemUris?.length) {
      setProblemUris(cachedProblemUris);
      setIsSubmitted(cachedProblemUris.map(() => false));
      setResponses(cachedProblemUris.map(() => undefined));
      setAllProblemUris(cachedProblemUris);
      return;
    }

    const fetchProblems = async () => {
      setIsLoadingProblemUris(true);
      const userInfo = await getUserProfile();
      const languages = userInfo?.languages;
      let selected: string[] = [];
      getProblemsPerSection(sectionUri, courseId, languages)
        .then((problems) => {
          const map: Record<string, string[]> = {};
          for (const p of problems) {
            if (!map[p.category]) map[p.category] = [];
            map[p.category].push(p.problemId);
          }
          setCategoryMap(map);
          setProblems(problems);

          if (category) {
            selected = map[category] || [];
            if (setCachedProblemUris) {
              setCachedProblemUris(selected);
            }
          } else {
            const categoryKeys = Object.keys(map);
            if (categoryKeys.length === 0) {
              setProblemUris([]);
              setIsSubmitted([]);
              setResponses([]);
              setIsLoadingProblemUris(false);
              return;
            }

            if (!map['syllabus']) map['syllabus'] = [];
            if (!map['adventurous']) map['adventurous'] = [];

            let selectedCategory: string;
            if (category) {
              selectedCategory = category;
            } else {
              selectedCategory = orderedCategoryKeys[parseInt(tabIndex)] || 'syllabus';
            }

            if (orderedCategoryKeys.includes(selectedCategory)) {
              const newIndex = orderedCategoryKeys.indexOf(selectedCategory);
              setTabIndex(newIndex.toString());
            }

            selected = map[selectedCategory] || [];

            if (setCachedProblemUris) {
              setCachedProblemUris(selected);
            }
          }

          setProblemUris(selected);
          setAllProblemUris(selected);
          setIsSubmitted(selected.map(() => false));
          setResponses(selected.map(() => undefined));
          setIsLoadingProblemUris(false);
        })
        .catch(() => setIsLoadingProblemUris(false));
    };
    fetchProblems();
  }, [sectionUri, courseId]);

  if (isLoadingProblemUris) return <LinearProgress />;

  if (!startQuiz) {
    return (
      <Button onClick={() => setStartQuiz(true)} variant="contained">
        {t.syllabus.replace('$1', problemUris.length.toString())}
      </Button>
    );
  }

  if (!show) {
    return (
      <Button onClick={() => setShow(true)} variant="contained">
        {t.syllabus.replace('$1', problemUris.length.toString())}
      </Button>
    );
  }

  const problemUri = problemUris[problemIdx];
  // TODO ALEA4-P3 const response = responses[problemIdx];
  // const solutions = problems[problemIdx]?.subProblemData?.map((p) => p.solution);

  const currentProblem = problems.find((p) => p.problemId === problemUris[problemIdx]);

  return (
    <Box mb={4}>
      <Box
        px={2}
        maxWidth="800px"
        m="auto"
        bgcolor="white"
        border="1px solid #CCC"
        borderRadius="5px"
      >
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
          <Tab
            value="forme"
            label={
              <Tooltip title={t.forMeTooltip}>
                <span>
                  {t.forMe} ({formeUris === null ? '...' : formeUris.length})
                </span>
              </Tooltip>
            }
          />

          {orderedCategoryKeys.map((cat, i) => {
            const labelText =
              cat === 'adventurous'
                ? t.adventurous
                : cat === 'syllabus'
                ? t.syllabus
                : cat[0].toUpperCase() + cat.slice(1);

            const tooltipText =
              cat === 'adventurous'
                ? t.adventurousTooltip
                : cat === 'syllabus'
                ? t.syllabusTooltip
                : `Problems in ${labelText}`;

            return (
              <Tab
                key={cat}
                value={i.toString()}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title={tooltipText}>
                      <span>
                        {labelText} ({categoryMap[cat]?.length || 0})
                      </span>
                    </Tooltip>
                  </Box>
                }
              />
            );
          })}
        </Tabs>
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
                  {currentProblem?.showForeignLanguageNotice && (
                    <Tooltip
                      title={`This problem is shown because you have ${currentProblem.matchedLanguage} in your language preferences.`}
                      slotProps={commonTooltipSlotProps}
                    >
                      <WarningAmberIcon
                        onClick={() => Router.push('/my-profile')}
                        style={{ ...commonIconStyles, color: '#1976d2' }}
                      />
                    </Tooltip>
                  )}
                  {currentProblem?.category === 'adventurous' &&
                    (currentProblem?.outOfSyllabusConcepts?.length ? (
                      <Tooltip
                        title={
                          <Box sx={{ padding: '8px', maxWidth: 300, whiteSpace: 'normal' }}>
                            <div style={{ marginBottom: '4px' }}>
                              This problem contains concepts that were not covered in the course:
                            </div>
                            {Array.from(new Set(currentProblem?.outOfSyllabusConcepts ?? [])).map(
                              (uri, idx) => {
                                const name = getParamFromUri(uri, 's') || uri;
                                const formatted = name
                                  .toLowerCase()
                                  .replace(/\b\w/g, (c) => c.toUpperCase());
                                return (
                                  <Tooltip title={uri} key={idx}>
                                    <b>{formatted}</b>
                                  </Tooltip>
                                );
                              }
                            )}
                          </Box>
                        }
                        slotProps={commonTooltipSlotProps}
                      >
                        <WarningAmberIcon sx={{ ...commonIconStyles, color: '#f57c00' }} />
                      </Tooltip>
                    ) : (
                      <Tooltip
                        title="This syllabus problem is shown here because of your language preferences."
                        slotProps={commonTooltipSlotProps}
                      >
                        <WarningAmberIcon
                          onClick={() => Router.push('/my-profile')}
                          style={{ ...commonIconStyles, color: '#1976d2' }}
                        />
                      </Tooltip>
                    ))}
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
