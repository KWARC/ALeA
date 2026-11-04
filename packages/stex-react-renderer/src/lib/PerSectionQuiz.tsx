import { SafeFTMLFragment } from './SafeFTMLComponents';
import { FTML } from '@flexiformal/ftml';
import { sourceFile as getSourceFile, solution as flamsSolution } from '@flexiformal/ftml-backend';
import { getProblemDataFromDocument } from '@alea/quiz-utils';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Box,
  Button,
  IconButton,
  LinearProgress,
  Tab,
  Tabs,
  Chip,
  Tooltip,
  Typography,
  TextField,
} from '@mui/material';
import {
  formatExamLabelDropdown,
  getProblemsPerSection,
  getUserProfile,
  postAnswerToLMP,
  ProblemAnswerEvent,
  ProblemData,
  formatQuizLabelDropdown,
} from '@alea/spec';
import { useCurrentUser } from '@alea/react-utils';
import { getParamFromUri } from '@alea/utils';
import Router, { useRouter } from 'next/router';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ForMe } from './ForMe';
import { getLocaleObject } from './lang/utils';
import { ProblemFilter } from './ProblemFilter';
import { ListStepper } from './QuizDisplay';
import { getProblemState, getUpdates } from './ProblemDisplay';
import { ExamSelect } from './ExamSelect';

export interface ExamRef {
  examUri: string;
  examLabel: string;
}

interface ExamInfoLite {
  uri: string;
}

function isValidExamRef(uri?: string) {
  if (!uri) return false;
  return Boolean(getParamFromUri(uri, 'd'));
}

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
  getSourceFile({ uri: problemUri }).then((sourceLink) => {
    if (sourceLink) window.open(sourceLink, '_blank');
  });
}

export function getProblemType(uri: string): 'quiz' | 'homework' | 'exam' | 'uncategorized' {
  const dParam = getParamFromUri(uri, 'd');
  if (uri.includes('/quiz') || uri.includes('&e=quiz')) return 'quiz';
  if (uri.includes('/assignments')) return 'homework';
  if (dParam) {
    return 'exam';
  }
  return 'uncategorized';
}

function getSolutionHtml(payload?: string) {
  if (!payload?.trim()) return undefined;
  try {
    const parsedSolution = FTML.Solutions.from_jstring(payload.replace(/^"|"$/g, ''));
    const html = parsedSolution
      ?.to_solutions()
      .map((solution) => ('Solution' in solution ? solution.Solution.html : undefined))
      .filter(Boolean)
      .join('');
    return html?.trim() ? html : undefined;
  } catch {
    return undefined;
  }
}

function SolutionDisplay({
  problemUri,
  isSubmitted,
}: {
  problemUri: string;
  isSubmitted: boolean;
}) {
  const [solutionHtml, setSolutionHtml] = useState<string | undefined>();

  useEffect(() => {
    if (!isSubmitted) return;
    flamsSolution({ uri: problemUri })
      .then((payload) => setSolutionHtml(getSolutionHtml(payload)))
      .catch(() => setSolutionHtml(undefined));
  }, [isSubmitted, problemUri]);

  if (!isSubmitted || !solutionHtml) return null;

  return (
    <Box
      sx={{
        mt: 1.5,
        p: 1.5,
        border: '1px solid #2e7d32',
        borderRadius: 1,
      }}
    >
      <Typography fontWeight="bold" component="span">
        Solution:{' '}
      </Typography>
      <SafeFTMLFragment fragment={{ type: 'HtmlString', html: solutionHtml, uri: problemUri }} />
    </Box>
  );
}

function FreeTextAnswer({ problemUri, isSubmitted }: { problemUri: string; isSubmitted: boolean }) {
  const answerKey = `practice-answer-${problemUri}`;
  const [answer, setAnswer] = useState(() =>
    typeof window === 'undefined' ? '' : window.localStorage.getItem(answerKey) ?? ''
  );

  function onAnswerChange(value: string) {
    setAnswer(value);
    if (typeof window !== 'undefined') window.localStorage.setItem(answerKey, value);
  }

  return (
    <Box sx={{ mt: 2 }}>
      <TextField
        label={isSubmitted ? 'Submitted answer' : 'Your answer'}
        value={answer}
        onChange={(event) => onAnswerChange(event.target.value)}
        minRows={2}
        multiline
        sx={{ width: '100%', maxWidth: 520 }}
        disabled={isSubmitted}
      />
      <SolutionDisplay problemUri={problemUri} isSubmitted={isSubmitted} />
    </Box>
  );
}

function PracticeProblemWrap({
  children,
  problemUri,
  autogradable,
  isSubmitted,
}: {
  children: ReactNode;
  problemUri: string;
  autogradable: boolean;
  isSubmitted: boolean;
}) {
  return (
    <Box>
      {children}
      {!autogradable ? <FreeTextAnswer problemUri={problemUri} isSubmitted={isSubmitted} /> : null}
    </Box>
  );
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
  const [objectives, setObjectives] = useState<
    [FTML.CognitiveDimension, FTML.SymbolUri][] | undefined
  >();
  const { user } = useCurrentUser();
  const responseRef = useRef(response);
  const setResponseRef = useRef(setResponse);
  setResponseRef.current = setResponse;
  if (response !== undefined) responseRef.current = response;

  useEffect(() => {
    setSolution(undefined);
    flamsSolution({ uri }).then(setSolution);
  }, [uri]);

  useEffect(() => {
    setObjectives(undefined);
    getProblemDataFromDocument(uri)
      .then((problemData) => setObjectives(problemData?.objectives ?? []))
      .catch(() => setObjectives([]));
  }, [uri]);

  useEffect(() => {
    return () => {
      setResponseRef.current?.(responseRef.current);
    };
  }, [uri]);

  useEffect(() => {
    if (!isSubmitted) return;
    setResponseRef.current?.(responseRef.current);
  }, [isSubmitted]);

  const latestResponse = isSubmitted ? response ?? responseRef.current : undefined;

  useEffect(() => {
    const state = getProblemState(isSubmitted, solution, latestResponse);
    if (state.type === 'Graded') {
      const scoreFraction = state.feedback?.score_fraction;
      setQuotient?.(scoreFraction);

      if (!latestResponse || scoreFraction === undefined || objectives === undefined) return;

      const answerObject: ProblemAnswerEvent = {
        type: 'problem-answer',
        uri,
        learner: user?.userId ?? '',
        score: scoreFraction,
        'max-points': 1,
        updates: getUpdates(objectives, scoreFraction),
        time: new Date().toISOString(),
        payload: '',
        comment: ' ',
      };

      postAnswerToLMP(answerObject).catch((error) =>
        console.error('Failed to post problem answer to LMP:', error)
      );
    }
  }, [isSubmitted, objectives, latestResponse, solution, setQuotient, uri, user?.userId]);

  // While interactive, omit current_response so parent answer state is not fed
  // back into FTML on each keystroke (that remounts the fill-in portal).
  const problemState = getProblemState(isSubmitted, solution, latestResponse);
  return (
    <Box fragment-uri={uri} fragment-kind="Problem">
      <SafeFTMLFragment
        key={`${uri}-${problemState.type}`}
        fragment={{ type: 'FromBackend', uri }}
        allowHovers={isSubmitted}
        problemStates={new Map([[uri, problemState]])}
        onProblemResponse={(next) => {
          // Keep answers on the ref only. Do not setResponse() here.
          // That re-renders this viewer; problemWrap then remounts the FTML
          // fill-in portal and the input loses focus on every keystroke.
          responseRef.current = next;
        }}
        problemWrap={(problemUri, _isSubProblem, autogradable) => {
          return function WrappedProblem(ch) {
            return (
              <PracticeProblemWrap
                problemUri={problemUri}
                autogradable={autogradable}
                isSubmitted={isSubmitted}
              >
                {ch}
              </PracticeProblemWrap>
            );
          };
        }}
      />
      {setIsSubmitted && (
        <Button
          onClick={() => {
            setResponse?.(responseRef.current);
            setIsSubmitted(true);
          }}
          disabled={isSubmitted}
          variant="contained"
        >
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

    const rest = Object.keys(categoryMap).filter(
      (cat) => !knownOrder.includes(cat) && cat !== 'exam'
    );

    return [...knownOrder, ...rest].filter(
      (cat) => cat === 'syllabus' || cat === 'adventurous' || categoryMap[cat]?.length
    );
  }, [categoryMap]);

  const examProblemIds = useMemo(
    () =>
      problems
        .filter((p) => p.examRefs?.some((e) => isValidExamRef(e.examUri)))
        .map((p) => p.problemId),
    [problems]
  );

  const problemUri = problemUris[problemIdx];

  const currentProblem = useMemo(() => {
    if (!problemUri) return undefined;
    return problems.find((p) => p.problemId === problemUri);
  }, [problems, problemUri]);

  const [selectedRef, setSelectedRef] = useState<{
    uri: string;
    type: 'exam' | 'quiz';
  } | null>(null);

  useEffect(() => {
    setSelectedRef(null);
  }, [problemUri]);

  const examOptions = useMemo<ExamInfoLite[]>(() => {
    if (!currentProblem?.examRefs) return [];

    const seen = new Map<string, ExamInfoLite>();

    currentProblem.examRefs
      .filter((e) => isValidExamRef(e.examUri))
      .forEach((e) => {
        if (!seen.has(e.examUri)) {
          seen.set(e.examUri, { uri: e.examUri });
        }
      });

    return Array.from(seen.values());
  }, [currentProblem]);

  const quizOptions = useMemo<{ uri: string }[]>(() => {
    if (!currentProblem?.quizRefs) return [];

    const seen = new Map<string, { uri: string }>();

    currentProblem.quizRefs.forEach((q) => {
      if (!seen.has(q.quizUri)) {
        seen.set(q.quizUri, { uri: q.quizUri });
      }
    });

    return Array.from(seen.values());
  }, [currentProblem]);

  const combinedOptions = useMemo(() => {
    const exams = examOptions.map((e) => ({
      uri: e.uri,
      type: 'exam' as const,
    }));

    const quizzes = quizOptions.map((q) => ({
      uri: q.uri,
      type: 'quiz' as const,
    }));

    return [...exams, ...quizzes];
  }, [examOptions, quizOptions]);

  const dropdownLabel = useMemo(() => {
    if (examOptions.length > 0 && quizOptions.length > 0) {
      return 'Appeared in exams & quizzes';
    }
    if (examOptions.length > 0) {
      return 'Appeared in exams';
    }
    if (quizOptions.length > 0) {
      return 'Appeared in quizzes';
    }
    return '';
  }, [examOptions, quizOptions]);

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
      let languages;
      try {
        const userInfo = await getUserProfile();
        languages = userInfo?.languages;
      } catch (err) {
        languages = undefined;
      }
      let selected: string[] = [];
      getProblemsPerSection(sectionUri, courseId, languages)
        .then((problems) => {
          const map: Record<string, string[]> = {};
          for (const p of problems) {
            if (!map[p.category]) map[p.category] = [];
            map[p.category].push(p.problemId);
          }
          if (!map['syllabus']) map['syllabus'] = [];
          if (!map['adventurous']) map['adventurous'] = [];

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

  // TODO ALEA4-P3 const response = responses[problemIdx];
  // const solutions = problems[problemIdx]?.subProblemData?.map((p) => p.solution);

  const handleApplyFilter = (filtered: string[], type: string) => {
    let finalUris = filtered;
    if (type === 'exam') {
      finalUris = examProblemIds;
    }
    setProblemUris(finalUris);
    setIsSubmitted(finalUris.map(() => false));
    setResponses(finalUris.map(() => undefined));
    setProblemIdx(0);
  };

  return (
    <Box mb={4}>
      <Box
        px={2}
        maxWidth={800}
        m="auto"
        bgcolor="background.paper"
        border="1px solid"
        borderColor="primary.main"
        borderRadius={1}
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
              problems={problems}
              onApply={handleApplyFilter}
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
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1,
                    mt: 2,
                  }}
                >
                  <Typography fontWeight="bold">
                    {`${t.problem} ${problemIdx + 1} ${t.of} ${problemUris.length}`}
                  </Typography>

                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1,
                      my: 2,
                    }}
                  >
                    {combinedOptions.length > 0 && !selectedRef && (
                      <Box sx={{ minWidth: 180 }}>
                        <ExamSelect
                          exams={combinedOptions.map((o) => ({ uri: o.uri }))}
                          courseId={courseId}
                          value=""
                          onChange={(uri) => {
                            const found = combinedOptions.find((o) => o.uri === uri);
                            if (found) {
                              setSelectedRef(found);
                            }
                          }}
                          label={dropdownLabel}
                          size="small"
                        />
                      </Box>
                    )}

                    {selectedRef && (
                      <Chip
                        label={
                          selectedRef.type === 'exam'
                            ? formatExamLabelDropdown(selectedRef.uri, undefined, courseId)
                            : formatQuizLabelDropdown(selectedRef.uri, undefined, courseId)
                        }
                        color={selectedRef.type === 'exam' ? 'error' : 'primary'}
                        onDelete={() => setSelectedRef(null)}
                        onClick={() =>
                          window.open(
                            selectedRef.type === 'exam'
                              ? `/exam-problems?examUri=${encodeURIComponent(selectedRef.uri)}`
                              : `/quiz-problems?quizUri=${encodeURIComponent(selectedRef.uri)}`,
                            '_blank'
                          )
                        }
                      />
                    )}
                  </Box>
                </Box>

                <Box mb={1}>
                  {currentProblem?.showForeignLanguageNotice && (
                    <Tooltip
                      title={`This problem is shown because you have ${currentProblem.matchedLanguage} in your language preferences.`}
                      slotProps={commonTooltipSlotProps}
                    >
                      <WarningAmberIcon
                        onClick={() => Router.push('/my-profile')}
                        sx={{ ...commonIconStyles, color: 'blue.sky' }}
                      />
                    </Tooltip>
                  )}
                  {currentProblem?.category === 'adventurous' &&
                    (currentProblem?.outOfSyllabusConcepts?.length ? (
                      <Tooltip
                        title={
                          <Box sx={{ p: 0.5, maxWidth: 300, whiteSpace: 'normal' }}>
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
                        <WarningAmberIcon sx={{ ...commonIconStyles, color: 'warning.main' }} />
                      </Tooltip>
                    ) : (
                      <Tooltip
                        title="This syllabus problem is shown here because of your language preferences."
                        slotProps={commonTooltipSlotProps}
                      >
                        <WarningAmberIcon
                          onClick={() => Router.push('/my-profile')}
                          sx={{ ...commonIconStyles, color: 'blue.sky' }}
                        />
                      </Tooltip>
                    ))}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <ListStepper
                    idx={problemIdx}
                    listSize={problemUris.length}
                    onChange={(idx) => {
                      setProblemIdx(idx);
                      setShowSolution(false);
                    }}
                  />
                  <IconButton onClick={() => handleViewSource(problemUri)}>
                    <Tooltip title="view source">
                      <OpenInNewIcon />
                    </Tooltip>
                  </IconButton>
                </Box>
                <Box mb={1.875}>
                  <UriProblemViewer
                    key={problemUri}
                    uri={problemUri}
                    isSubmitted={isSubmitted[problemIdx]}
                    setIsSubmitted={(v) =>
                      setIsSubmitted((prev) => {
                        const next = [...prev];
                        next[problemIdx] = v;
                        return next;
                      })
                    }
                    response={responses[problemIdx]}
                    setResponse={(v) =>
                      setResponses((prev) => {
                        const next = [...prev];
                        next[problemIdx] = v;
                        return next;
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
                    gap: 1.25,
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
                    <Box mb={1.25}>
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
