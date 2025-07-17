import { getFlamsServer } from '@kwarc/ftml-react';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  fetchGeneratedProblems,
  generateQuizProblems,
  getCourseGeneratedProblemsBySection as getCourseGeneratedProblemsCountBySection,
  getCourseInfo,
  getCoverageTimeline,
} from '@stex-react/api';
import { updateRouterQuery } from '@stex-react/react-utils';
import { CourseInfo, CoverageTimeline } from '@stex-react/utils';
import { useRouter } from 'next/router';
import { ExistingProblem, FlatQuizProblem } from 'packages/alea-frontend/pages/quiz-gen';
import { SecInfo } from 'packages/alea-frontend/types';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { getSecInfo } from '../coverage-update';
import axios from 'axios';
import { getUpcomingQuizSyllabus } from '../QuizDashboard';

function getSectionRange(startUri: string, endUri: string, sections: SecInfo[]) {
  if (!sections?.length) return;
  const startIdx = sections.findIndex((s) => s.uri === startUri);
  const endIdx = sections.findIndex((s) => s.uri === endUri);
  if (startIdx === -1 || endIdx === -1) return [];
  const [from, to] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
  return sections.slice(from, to + 1);
}
export const CourseSectionSelector = ({
  courseId,
  sections,
  setSections,
  setExistingProblemUris,
  setGeneratedProblems,
  setLatestGeneratedProblems,
  loading,
  setLoading,
}: {
  courseId: string;
  sections: SecInfo[];
  setSections: Dispatch<SetStateAction<SecInfo[]>>;
  setExistingProblemUris: Dispatch<React.SetStateAction<ExistingProblem[]>>;
  setGeneratedProblems: Dispatch<SetStateAction<FlatQuizProblem[]>>;
  setLatestGeneratedProblems: Dispatch<SetStateAction<FlatQuizProblem[]>>;
  loading: boolean;
  setLoading: (value: boolean) => void;
}) => {
  const router = useRouter();
  const startSectionUri = (router.query.startSectionUri as string) || '';
  const endSectionUri = (router.query.endSectionUri as string) || '';
  const [courses, setCourses] = useState<{ [courseId: string]: CourseInfo }>({});
  const existingProblemsCache = useRef<Record<string, ExistingProblem[]>>({});
  const [generatedProblemsCount, setGeneratedProblemsCount] = useState<Record<string, number>>({});
  const [existingProblemsCount, setExistingProblemsCount] = useState<Record<string, number>>({});
  const [loadingSections, setLoadingSections] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [coverageTimeline, setCoverageTimeline] = useState<CoverageTimeline>({});
  const [upcomingQuizSyllabus, setUpcomingQuizSyllabus] = useState<{
    startSecUri: string;
    endSecUri: string;
  }>({ startSecUri: '', endSecUri: '' });

  useEffect(() => {
    getCourseInfo().then(setCourses);
  }, []);
  useEffect(() => {
    async function fetchCoverageTimeline() {
      const coverageTimeline = await getCoverageTimeline(true);
      if (!coverageTimeline) return;
      setCoverageTimeline(coverageTimeline);
    }
    fetchCoverageTimeline();
  }, []);

  useEffect(() => {
    const getSections = async () => {
      if (!courseId) return;
      const courseInfo = courses?.[courseId as string];
      if (!courseInfo?.notes) return;
      const notesUri = courseInfo.notes;
      setLoadingSections(true);
      try {
        const toc = (await getFlamsServer().contentToc({ uri: notesUri }))?.[1] ?? [];
        const formattedSections = toc.flatMap((entry) =>
          getSecInfo(entry).map(({ id, uri, title }) => ({ id, uri, title }))
        );
        setSections(formattedSections);
        const allSectionUris = formattedSections.map((s) => s.uri);
        if (!allSectionUris.includes(startSectionUri)) {
          updateRouterQuery(router, { startSectionUri: '', endSectionUri: '' }, true);
        } else if (!allSectionUris.includes(endSectionUri)) {
          updateRouterQuery(router, { endSectionUri: '' }, true);
        }
      } catch (error) {
        console.error('Failed to fetch document sections:', error);
      } finally {
        setLoadingSections(false);
      }
    };

    getSections();
  }, [courseId, courses]);

  useEffect(() => {
    const timeline = coverageTimeline[courseId];
    const syllabus = getUpcomingQuizSyllabus(timeline, sections);
    if (syllabus) {
      setUpcomingQuizSyllabus(syllabus);
    }
  }, [coverageTimeline, courseId, sections]);
  useEffect(() => {
    const fetchCounts = async () => {
      if (!courseId) return;
      const generatedCounts = await getCourseGeneratedProblemsCountBySection(courseId);
      const existingCountsResp = await axios.get(
        `/api/get-course-problem-counts?courseId=${courseId}`
      );
      setGeneratedProblemsCount(generatedCounts);
      setExistingProblemsCount(existingCountsResp.data);
    };
    fetchCounts();
  }, [courseId]);

  useEffect(() => {
    if (!startSectionUri || !endSectionUri || !courseId || !sections.length) return;
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const rangeSections = getSectionRange(startSectionUri, endSectionUri, sections);
        const allExisting: ExistingProblem[] = [];
        for (const section of rangeSections) {
          const { id: sectionId, uri: sectionUri } = section;
          if (existingProblemsCache.current[sectionUri]) {
            allExisting.push(...existingProblemsCache.current[sectionUri]);
          } else {
            try {
              const resp = await axios.get(
                `/api/get-problems-by-section?sectionUri=${encodeURIComponent(sectionUri)}`
              );
              const problemUris: string[] = resp.data;
              const enrichedProblems = problemUris.map((uri) => ({
                uri,
                sectionUri,
                sectionId,
              }));
              existingProblemsCache.current[sectionUri] = enrichedProblems;
              allExisting.push(...enrichedProblems);
            } catch (err) {
              console.error(`Failed to fetch existing problems for ${sectionUri}:`, err);
            }
          }
        }
        const uniqueExisting = Array.from(new Map(allExisting.map((p) => [p.uri, p])).values());
        setExistingProblemUris(uniqueExisting);
        const generatedProblemsResp = await fetchGeneratedProblems(
          courseId,
          startSectionUri,
          endSectionUri
        );
        const parsedProblems: FlatQuizProblem[] = generatedProblemsResp.map(
          ({ problemJson, ...rest }) => ({
            ...rest,
            ...problemJson,
          })
        );
        setGeneratedProblems(parsedProblems);
      } catch (err) {
        console.error('Error in fetchInitialData:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [courseId, startSectionUri, endSectionUri, sections]);

  const generateNewProblems = async () => {
    setGenerating(true);
    try {
      const response = await generateQuizProblems(courseId, startSectionUri, endSectionUri);
      if (!response?.length) {
        return;
      }
      const parsedProblems: FlatQuizProblem[] = response.map(({ problemJson, ...rest }) => ({
        ...rest,
        ...problemJson,
      }));
      setLatestGeneratedProblems(parsedProblems);
      setGeneratedProblems((prev) => [...prev, ...parsedProblems]);
    } catch (error) {
      console.error(' Error generating problems:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Paper
      sx={{
        p: 4,
        borderRadius: 3,
        bgcolor: 'white',
        boxSizing: 'border-box',
        border: '0.5px solid rgb(197, 199, 207)',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" px={2} py={1} mb={3}>
        <Typography variant="h5" fontWeight="bold" color="primary">
          Select Course and Sections
        </Typography>

        <Tooltip title="Auto-select sections from upcoming quiz syllabus" arrow>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              if (!upcomingQuizSyllabus) return;
              const { startSecUri, endSecUri } = upcomingQuizSyllabus;
              updateRouterQuery(
                router,
                { startSectionUri: startSecUri, endSectionUri: endSecUri },
                true
              );
            }}
            sx={{
              px: 2,
              py: 1,
              borderRadius: 2,
              fontSize: '0.875rem',
            }}
          >
            Quiz Syllabus
          </Button>
        </Tooltip>
      </Box>
      <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: '100px' }} key={courseId}>
          <InputLabel>Course</InputLabel>
          <Select
            value={courseId}
            label="Course"
            onChange={(e) =>
              updateRouterQuery(
                router,
                { courseId: e.target.value, startSectionId: '', endSectionId: '' },
                true
              )
            }
          >
            {Object.keys(courses).map((courseId) => (
              <MenuItem key={courseId} value={courseId}>
                {courseId}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {loadingSections ? (
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={20} />
            <Typography>Loading sections...</Typography>
          </Box>
        ) : (
          <>
            <FormControl sx={{ minWidth: '250px', flex: '1 1 auto' }}>
              <InputLabel>Start Section</InputLabel>
              <Select
                value={startSectionUri}
                label="Start Section"
                onChange={(e) => {
                  const newStart = e.target.value;
                  const updates: Record<string, string> = { startSectionUri: newStart };
                  if (!endSectionUri) {
                    updates.endSectionUri = newStart;
                  }
                  updateRouterQuery(router, updates, true);
                }}
              >
                {sections.map((s) => (
                  <MenuItem key={s.title} value={s.uri}>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      width="100%"
                    >
                      <span>{s.title}</span>

                      <Box
                        display="flex"
                        borderRadius={4}
                        overflow="hidden"
                        boxShadow={1}
                        fontSize="0.75rem"
                        sx={{
                          border: '1px solid #ccc',
                        }}
                      >
                        <Tooltip title="Existing problems">
                          <Box px={1.2} py={0.3} bgcolor="primary.main" color="white">
                            {existingProblemsCount[s.uri] || 0}
                          </Box>
                        </Tooltip>
                        <Tooltip title="Generated problems">
                          <Box
                            px={1.2}
                            py={0.3}
                            bgcolor="success.main"
                            color="white"
                            borderLeft="1px solid rgba(255, 255, 255, 0.3)"
                          >
                            {generatedProblemsCount[s.uri] || 0}
                          </Box>
                        </Tooltip>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: '250px', flex: '1 1 auto' }}>
              <InputLabel>End Section</InputLabel>
              <Select
                value={endSectionUri}
                label="End Section"
                onChange={(e) => {
                  const newEnd = e.target.value;
                  const updates: Record<string, string> = { endSectionUri: newEnd };
                  if (!startSectionUri) {
                    updates.startSectionUri = newEnd;
                  }
                  updateRouterQuery(router, updates, true);
                }}
              >
                {sections.map((s) => (
                  <MenuItem key={s.title} value={s.uri}>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      width="100%"
                    >
                      <span>{s.title}</span>

                      <Box
                        display="flex"
                        borderRadius={4}
                        overflow="hidden"
                        boxShadow={1}
                        fontSize="0.75rem"
                        sx={{
                          border: '1px solid #ccc',
                        }}
                      >
                        <Tooltip title="Existing problems">
                          <Box px={1.2} py={0.3} bgcolor="primary.main" color="white">
                            {existingProblemsCount[s.uri] || 0}
                          </Box>
                        </Tooltip>
                        <Tooltip title="Generated problems">
                          <Box
                            px={1.2}
                            py={0.3}
                            bgcolor="success.main"
                            color="white"
                            borderLeft="1px solid rgba(255, 255, 255, 0.3)"
                          >
                            {generatedProblemsCount[s.uri] || 0}
                          </Box>
                        </Tooltip>
                      </Box>
                    </Box>{' '}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        )}

        <Box display="flex">
          {generating ? (
            <Button variant="contained" disabled>
              <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
              Generating...
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={() => generateNewProblems()}
              disabled={!courseId || !startSectionUri || !endSectionUri || loading}
            >
              Generate
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
};
