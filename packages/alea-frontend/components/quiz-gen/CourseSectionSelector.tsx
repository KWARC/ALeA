import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/router';
import { FlatQuizProblem } from 'packages/alea-frontend/pages/quiz-gen';
import { CourseInfo } from '@stex-react/utils';
import { generateMoreQuizProblems, generateQuizProblems, getCourseInfo } from '@stex-react/api';
import { getFlamsServer } from '@kwarc/ftml-react';
import { getSecInfo } from '../coverage-update';
import { SecInfo } from 'packages/alea-frontend/types';

export const CourseSectionSelector = ({
  loading,
  setLoading,
  sections,
  setSections,
  setProblems,
  setLatestGeneratedProblems,
}: {
  loading: boolean;
  setLoading: (value: boolean) => void;
  sections: SecInfo[];
  setSections: Dispatch<SetStateAction<SecInfo[]>>;
  setProblems: Dispatch<SetStateAction<FlatQuizProblem[]>>;
  setLatestGeneratedProblems: Dispatch<SetStateAction<FlatQuizProblem[]>>;
}) => {
  const router = useRouter();
  const {
    courseId: routeCourseId,
    startSectionId: routeStartSecId,
    endSectionId: routeEndSecId,
  } = router.query;
  const [courses, setCourses] = useState<{ [courseId: string]: CourseInfo }>({});
  const [selectedCourseId, setSelectedCourseId] = useState((routeCourseId as string) ?? '');
  const [startSectionId, setStartSectionId] = useState((routeStartSecId as string) ?? '');
  const [endSectionId, setEndSectionId] = useState((routeEndSecId as string) ?? '');
  const [hasPriorProblems, setHasPriorProblems] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);

  useEffect(() => {
    getCourseInfo().then(setCourses);
  }, []);

  useEffect(() => {
    const getSections = async () => {
      if (!selectedCourseId) return;

      const courseInfo = courses?.[selectedCourseId];
      if (!courseInfo?.notes) return;
      const notesUri = courseInfo.notes;

      setLoadingSections(true);
      try {
        const toc = (await getFlamsServer().contentToc({ uri: notesUri }))?.[1] ?? [];
        const formattedSections = toc.flatMap((entry) =>
          getSecInfo(entry).map(({ id, uri, title }) => ({ id, uri, title }))
        );
        setSections(formattedSections);
        setStartSectionId('');
        setEndSectionId('');
      } catch (error) {
        console.error('Failed to fetch document sections:', error);
      } finally {
        setLoadingSections(false);
      }
    };

    getSections();
  }, [selectedCourseId, courses]);

  useEffect(() => {
    setHasPriorProblems(false);
  }, [startSectionId, endSectionId, selectedCourseId]);

  const generateNewProblems = async (mode: 'initial' | 'more' = 'initial') => {
    setLoading(true);
    try {
      const fetchFn = mode === 'more' ? generateMoreQuizProblems : generateQuizProblems;
      const response = await fetchFn(selectedCourseId, startSectionId, endSectionId);
      if (!response?.length) {
        return;
      }
      const parsedProblems: FlatQuizProblem[] = response.map(({ problemJson, ...rest }) => ({
        ...rest,
        ...problemJson,
      }));
      setHasPriorProblems(true);
      setLatestGeneratedProblems(parsedProblems);
      setProblems((prev) => (mode === 'more' ? [...prev, ...parsedProblems] : parsedProblems));
    } catch (error) {
      console.error(' Error generating problems:', error);
    } finally {
      setLoading(false);
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
      <Typography variant="h5" fontWeight="bold" mb={3} color="primary">
        Select Course and Sections
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: '100px' }}>
          <InputLabel>Course</InputLabel>
          <Select
            value={selectedCourseId}
            label="Course"
            onChange={(e) => setSelectedCourseId(e.target.value)}
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
                value={startSectionId}
                label="Start Section"
                onChange={(e) => setStartSectionId(e.target.value)}
              >
                {sections.map((s) => (
                  <MenuItem key={s.title} value={s.id}>
                    {s.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: '250px', flex: '1 1 auto' }}>
              <InputLabel>End Section</InputLabel>
              <Select
                value={endSectionId}
                label="End Section"
                onChange={(e) => setEndSectionId(e.target.value)}
              >
                {sections.map((s) => (
                  <MenuItem key={s.title} value={s.id}>
                    {s.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        )}

        <Box display="flex">
          {loading ? (
            <Button variant="contained" disabled>
              <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
              Generating...
            </Button>
          ) : hasPriorProblems ? (
            <Button
              variant="outlined"
              onClick={() => generateNewProblems('more')}
              disabled={!selectedCourseId || !startSectionId || !endSectionId}
            >
              Generate More
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={() => generateNewProblems('initial')}
              disabled={!selectedCourseId || !startSectionId || !endSectionId}
            >
              Generate
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
};
