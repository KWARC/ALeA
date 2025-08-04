import { FTMLFragment, getFlamsServer } from '@kwarc/ftml-react';
import { FTML } from '@kwarc/ftml-viewer';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  LinearProgress,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getLocaleObject } from './lang/utils';
import { getProblemState } from './ProblemDisplay';
import { ListStepper } from './QuizDisplay';
import FilterListIcon from '@mui/icons-material/FilterList';

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

function isAutoGradable(uri: string): boolean {
  return uri.includes('&e=quiz') || uri.includes('/quiz');
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
  const [filterType, setFilterType] = useState<
    'all' | 'quiz' | 'homework' | 'exam' | 'uncategorized'
  >('all');
  const [allProblemUris, setAllProblemUris] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [tempFilters, setTempFilters] = useState({
    quiz: true,
    homework: true,
    exam: true,
    uncategorized: true,
  });

  useEffect(() => {
    if (filterType === 'all') {
      setTempFilters({ quiz: true, homework: true, exam: true, uncategorized: true });
    } else if (filterType === 'quiz') {
      setTempFilters({ quiz: true, homework: false, exam: false, uncategorized: false });
    } else if (filterType === 'homework') {
      setTempFilters({ quiz: false, homework: true, exam: false, uncategorized: false });
    } else if (filterType === 'exam') {
      setTempFilters({ quiz: false, homework: false, exam: true, uncategorized: false });
    } else if (filterType === 'uncategorized') {
      setTempFilters({ quiz: false, homework: false, exam: false, uncategorized: true });
    }
  }, [filterType]);

  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    if (filterType === 'all') {
      setTempFilters({ quiz: true, homework: true, exam: true, uncategorized: true });
    } else if (filterType === 'quiz') {
      setTempFilters({ quiz: true, homework: false, exam: false, uncategorized: false });
    } else if (filterType === 'homework') {
      setTempFilters({ quiz: false, homework: true, exam: false, uncategorized: false });
    } else if (filterType === 'exam') {
      setTempFilters({ quiz: false, homework: false, exam: true, uncategorized: false });
    } else if (filterType === 'uncategorized') {
      setTempFilters({ quiz: false, homework: false, exam: false, uncategorized: true });
    }
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const handleFilterChange =
    (filterName: 'quiz' | 'homework' | 'exam' | 'uncategorized') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setTempFilters((prev) => ({
        ...prev,
        [filterName]: event.target.checked,
      }));
    };

  const applyFilters = () => {
    let newFilterType: 'all' | 'quiz' | 'homework' | 'exam' | 'uncategorized' = 'all';

    const activeFilters = Object.entries(tempFilters).filter(([_, value]) => value);

    if (activeFilters.length === 1) {

      newFilterType = activeFilters[0][0] as 'quiz' | 'homework' | 'exam' | 'uncategorized';
    } else if (activeFilters.length === 0) {
      newFilterType = 'all';
      setTempFilters({ quiz: true, homework: true, exam: true, uncategorized: true });
    } else if (activeFilters.length === 4) {
      newFilterType = 'all';
    } else {
      newFilterType = 'all';
    }
    applyFilter(newFilterType);
    handleFilterClose();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filterType !== 'all') count = 1;
    return count;
  };

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

        setAllProblemUris(filtered);
        setProblemUris(filtered);
        if (setCachedProblemUris) setCachedProblemUris(filtered);

        setIsLoadingProblemUris(false);
        setIsSubmitted(filtered.map(() => false));
        setResponses(filtered.map(() => undefined));
      }, console.error);
  }, [sectionUri, cachedProblemUris, setCachedProblemUris, category]);

  if (isLoadingProblemUris) return <LinearProgress />;
  if (!problemUris.length) {
    return (
      <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
        {filterType === 'all'
          ? t.NoPracticeProblemsAll
          : `No ${
              filterType === 'quiz'
                ? 'Quiz'
                : filterType === 'homework'
                ? 'Homework'
                : filterType === 'exam'
                ? 'Exam'
                : 'Uncategorized'
            } problems found.`}
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
  function applyFilter(type: 'all' | 'quiz' | 'homework' | 'exam' | 'uncategorized') {
    setFilterType(type);

    const filtered = allProblemUris.filter((uri) => {
      if (type === 'quiz') return uri.includes('quiz');
      if (type === 'homework') return uri.includes('homework');
      if (type === 'exam') return uri.includes('exam');
      if (type === 'uncategorized') {
        return !uri.includes('quiz') && !uri.includes('homework') && !uri.includes('exam');
      }
      return true; // 'all'
    });

    setProblemUris(filtered);
    setIsSubmitted(filtered.map(() => false));
    setResponses(filtered.map(() => undefined));
    setProblemIdx(0);
  }

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
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Badge badgeContent={getActiveFilterCount()} color="primary">
          <IconButton
            onClick={handleFilterClick}
            sx={{
              border: '1px solid #e0e0e0',
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <FilterListIcon />
          </IconButton>
        </Badge>

        <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
          {filterType === 'all'
            ? `Showing all ${problemUris.length} problems`
            : `Showing ${problemUris.length} ${
                filterType === 'quiz'
                  ? 'Quiz'
                  : filterType === 'homework'
                  ? 'Homework'
                  : filterType === 'exam'
                  ? 'Exam'
                  : 'Uncategorized'
              } problems`}
        </Typography>

        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={handleFilterClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <Box sx={{ p: 2, minWidth: 250 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Filter Problems
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={tempFilters.quiz}
                    onChange={handleFilterChange('quiz')}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>Quiz</span>
                    <Typography variant="caption" color="text.secondary">
                      ({allProblemUris.filter((uri) => isAutoGradable(uri)).length})
                    </Typography>
                  </Box>
                }
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={tempFilters.homework}
                    onChange={handleFilterChange('homework')}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>Homework</span>
                    <Typography variant="caption" color="text.secondary">
                      ({allProblemUris.filter((uri) => !isAutoGradable(uri)).length})
                    </Typography>
                  </Box>
                }
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={tempFilters.exam}
                    onChange={handleFilterChange('exam')}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>Exam</span>
                    <Typography variant="caption" color="text.secondary">
                      ({allProblemUris.filter((uri) => !isAutoGradable(uri)).length})
                    </Typography>
                  </Box>
                }
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={tempFilters.uncategorized}
                    onChange={handleFilterChange('uncategorized')}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>Uncategorized</span>
                    <Typography variant="caption" color="text.secondary">
                      ({allProblemUris.filter((uri) => !isAutoGradable(uri)).length})
                    </Typography>
                  </Box>
                }
              />
            </FormGroup>
            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button size="small" onClick={handleFilterClose}>
                Cancel
              </Button>
              <Button size="small" variant="contained" onClick={applyFilters}>
                Apply Filters
              </Button>
            </Box>
          </Box>
        </Popover>
      </Box>
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
