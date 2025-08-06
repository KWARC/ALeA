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
import { useEffect, useState } from 'react';
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
  const [tabIndex, setTabIndex] = useState(0);
  const [categoryMap, setCategoryMap] = useState<Record<string, string[]>>({});
  const [allProblemUris, setAllProblemUris] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<
    'all' | 'quiz' | 'homework' | 'exam' | 'uncategorized'
  >('all');

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [tempFilters, setTempFilters] = useState({
    quiz: true,
    homework: true,
    exam: true,
    uncategorized: true,
  });

  function applyFilter(type: 'all' | 'quiz' | 'homework' | 'exam' | 'uncategorized') {
    setFilterType(type);

    const filtered = allProblemUris.filter((uri) => {
      if (type === 'quiz') return getProblemType(uri) === 'quiz';
      if (type === 'homework') return getProblemType(uri) === 'homework';
      if (type === 'exam') return getProblemType(uri) === 'exam';
      if (type === 'uncategorized') return getProblemType(uri) === 'uncategorized';
      return true;
    });

    setProblemUris(filtered);
    setIsSubmitted(filtered.map(() => false));
    setResponses(filtered.map(() => undefined));
    setProblemIdx(0);
  }

  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const handleFilterChange =
    (filterName: keyof typeof tempFilters) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setTempFilters((prev) => ({
        ...prev,
        [filterName]: event.target.checked,
      }));
    };

  const applyFilters = () => {
    const activeFilters = Object.entries(tempFilters).filter(([_, val]) => val);
    if (activeFilters.length === 1) {
      applyFilter(activeFilters[0][0] as typeof filterType);
    } else {
      applyFilter('all');
    }
    handleFilterClose();
  };

  useEffect(() => {
    setIsLoadingProblemUris(true);

    getProblemsPerSection(sectionUri, courseId)
      .then((problems) => {
        const map: Record<string, string[]> = {};
        for (const p of problems) {
          if (!map[p.category]) map[p.category] = [];
          map[p.category].push(p.problemId);
        }
        setCategoryMap(map);

        const all = Object.values(map).flat();
        setAllProblemUris(all);

        let selected: string[] = [];

        if (cachedProblemUris && cachedProblemUris.length > 0) {
          selected = cachedProblemUris;
          setAllProblemUris(selected);
        } else if (category) {
          selected = map[category] || [];
          setCachedProblemUris?.(selected);
          setAllProblemUris(selected);
        } else {
          const categoryKeys = Object.keys(map);
          const selectedCategory = categoryKeys[tabIndex] || categoryKeys[0];
          selected = map[selectedCategory] || [];
          setCachedProblemUris?.(all);
          setAllProblemUris(selected);
        }

        setProblemUris(selected);
        setIsSubmitted(selected.map(() => false));
        setResponses(selected.map(() => undefined));
        setIsLoadingProblemUris(false);
      })
      .catch(() => setIsLoadingProblemUris(false));
  }, [sectionUri, courseId]);

  if (isLoadingProblemUris) return <LinearProgress />;

  const filterUI = (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Tooltip title="Filter problems">
        <IconButton onClick={handleFilterClick}>
          <FilterList />
        </IconButton>
      </Tooltip>

      <Typography variant="body2" sx={{ ml: 1 }}>
        {filterType === 'all'
          ? `Showing all ${problemUris.length} problems`
          : `Showing ${problemUris.length} ${filterType} problems`}
      </Typography>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleFilterClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: 250 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Filter Problems
          </Typography>

          {(['quiz', 'homework', 'exam', 'uncategorized'] as const).map((type) => (
            <FormControlLabel
              key={type}
              control={
                <Checkbox
                  checked={tempFilters[type]}
                  onChange={handleFilterChange(type)}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>{type[0].toUpperCase() + type.slice(1)}</span>
                  <Typography variant="caption" color="text.secondary">
                    ({allProblemUris.filter((uri) => getProblemType(uri) === type).length})
                  </Typography>
                </Box>
              }
            />
          ))}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button size="small" onClick={handleFilterClose}>
              Cancel
            </Button>
            <Button size="small" variant="contained" onClick={applyFilters}>
              Apply
            </Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  );

  if (!problemUris.length) {
    return (
      <Box>
        {filterUI}
        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
          {t.NoPracticeProblemsAll}
        </Typography>
      </Box>
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
    <Box mb={4}>
      {filterUI}
      {/* <ProblemFilter
        allProblemUris={allProblemUris}
        onApply={(filtered, type) => {
          setProblemUris(filtered);
          setIsSubmitted(filtered.map(() => false));
          setResponses(filtered.map(() => undefined));
          setProblemIdx(0);
        }}
      /> */}

      <Box
        px={2}
        maxWidth="800px"
        m="auto"
        bgcolor="white"
        border="1px solid #CCC"
        borderRadius="5px"
      >
        <Typography fontWeight="bold" textAlign="left">
          {`${t.problem} ${problemIdx + 1} ${t.of} ${problemUris.length} `}
        </Typography>
        {!category && (
          <Tabs
            value={tabIndex}
            onChange={(_, idx) => {
              const categoryKeys = Object.keys(categoryMap);
              const safeIdx = Math.min(idx, categoryKeys.length - 1);
              setTabIndex(safeIdx);
              const selectedCategory = categoryKeys[safeIdx];
              const selected = categoryMap[selectedCategory] || [];

              setAllProblemUris(selected);

              const filtered = selected.filter((uri) => {
                if (filterType === 'all') return true;
                return getProblemType(uri) === filterType;
              });

              setProblemUris(filtered);
              setIsSubmitted(filtered.map(() => false));
              setResponses(filtered.map(() => undefined));
              setProblemIdx(0);
            }}
          >
            {Object.keys(categoryMap).map((cat) => {
              const label =
                cat === 'adventurous'
                  ? "I'm Adventurous"
                  : cat === 'syllabus'
                  ? 'Syllabus'
                  : cat[0].toUpperCase() + cat.slice(1);
              return <Tab key={cat} label={label} />;
            })}
          </Tabs>
        )}
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
    </Box>
  );
}
