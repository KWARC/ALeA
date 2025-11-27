import { FTML, injectCss } from '@flexiformal/ftml';
import { OpenInNew } from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import UpdateIcon from '@mui/icons-material/Update';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import {
  canAccessResource,
  createQuiz,
  deleteQuiz,
  FTMLProblemWithSolution,
  getAllQuizzes,
  getCourseInfo,
  getCoverageTimeline,
  getQuizStats,
  Phase,
  QuizStatsResponse,
  QuizWithStatus,
  updateQuiz,
} from '@alea/spec';
import { getQuizPhase } from '@alea/quiz-utils';
import { SafeHtml } from '@alea/react-utils';
import { Action, CoverageTimeline, LectureEntry, ResourceName, roundToMinutes } from '@alea/utils';
import { AxiosResponse } from 'axios';
import dayjs from 'dayjs';
import type { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { useCurrentTermContext } from '../contexts/CurrentTermContext';
import { CheckboxWithTimestamp } from './CheckBoxWithTimestamp';
import { EndSemSumAccordion } from './EndSemSumAccordion';
import { ExcusedAccordion } from './ExcusedAccordion';
import { QuizFileReader } from './QuizFileReader';
import { QuizStatsDisplay } from './QuizStatsDisplay';
import { RecorrectionDialog } from './RecorrectionDialog';
import { useRouter } from 'next/router';
import { contentToc } from '@flexiformal/ftml-backend';
import { getSecInfo } from './coverage-update';
import { SecInfo } from '../types';
import { getLectureEntry, LectureSchedule } from '@alea/spec';

const NEW_QUIZ_ID = 'New';

function isNewQuiz(quizId: string) {
  return quizId === NEW_QUIZ_ID;
}

export function validateQuizUpdate(
  originalProblems: Record<string, FTMLProblemWithSolution>,
  newProblems: Record<string, FTMLProblemWithSolution>,
  totalStudents: number
) {
  if (totalStudents === 0) return { valid: true };
  const originalURIs = Object.values(originalProblems)
    .map((p) => p.problem?.uri || '')
    .filter(Boolean)
    .sort();

  const newURIs = Object.values(newProblems)
    .map((p) => p.problem?.uri || '')
    .filter(Boolean)
    .sort();

  if (
    originalURIs.length !== newURIs.length ||
    originalURIs.some((uri, idx) => uri !== newURIs[idx])
  ) {
    const notFoundURIs = originalURIs.filter((uri) => !newURIs.includes(uri));
    const newUriFound = newURIs.filter((uri) => !originalURIs.includes(uri));
    return {
      valid: false,
      notFoundURIs,
      newUriFound,
    };
  }
  return { valid: true };
}

function getFormErrorReason(
  quizStartTs: number,
  quizEndTs: number,
  feedbackReleaseTs: number,
  manuallySetPhase: string,
  problems: Record<string, FTMLProblemWithSolution>,
  title: string,
  css: FTML.Css[]
) {
  const phaseTimes = [quizStartTs, quizEndTs, feedbackReleaseTs].filter((ts) => ts !== 0);
  for (let i = 0; i < phaseTimes.length - 1; i++) {
    if (phaseTimes[i] > phaseTimes[i + 1]) return 'Phase times are not in order.';
  }
  if (!problems || Object.keys(problems).length === 0) return 'No problems found.';
  if (title.length === 0) return 'No title set.';
  if (!css.length) return 'CSS content is missing';
  return undefined;
}

const QuizDurationInfo = ({ quizStartTs, quizEndTs, feedbackReleaseTs }) => {
  const quizDuration = dayjs(quizEndTs).diff(dayjs(quizStartTs), 'minutes');
  const feedbackDuration = dayjs(feedbackReleaseTs).diff(dayjs(quizEndTs), 'minutes');
  if (!(quizEndTs - quizStartTs)) return null;
  return (
    <Box
      sx={{
        backgroundColor: '#edf7ed',
        p: '5px',
        borderRadius: '5px',
        border: '1px solid #edf7ed',
        marginTop: '5px',
      }}
    >
      <Typography sx={{ color: '#1e4620' }}>
        Quiz is <strong>{`${quizDuration} minutes`}</strong> long, and it will take additional{' '}
        <strong>{`${feedbackDuration} minutes`}</strong> for feedback release
      </Typography>
    </Box>
  );
};
export function getUpcomingQuizSyllabus(
  coverageTimeline: LectureEntry[],
  sections: SecInfo[]
): { startSecUri: string; endSecUri: string } | null {
  if (!coverageTimeline || !Array.isArray(sections) || sections.length === 0) return null;

  const upcomingQuizEntry = coverageTimeline.find(
    (entry) => entry.isQuizScheduled && entry.timestamp_ms >= Date.now()
  );
  if (!upcomingQuizEntry) return null;

  const upcomingIndex = coverageTimeline.findIndex((e) => e === upcomingQuizEntry);
  const endSecUri =
    coverageTimeline
      .slice(0, upcomingIndex)
      .reverse()
      .find((entry) => entry.sectionUri)?.sectionUri || '';

  let lastQuizEndUri = '';
  for (let i = upcomingIndex - 1; i >= 0; i--) {
    const entry = coverageTimeline[i];
    if (entry.isQuizScheduled) {
      lastQuizEndUri = coverageTimeline[i - 1]?.sectionUri || '';
      break;
    }
  }

  const lastQuizIndex = sections.findIndex((s) => s.uri === lastQuizEndUri);
  let startSecUri =
    lastQuizIndex !== -1 && lastQuizIndex + 1 < sections.length
      ? sections[lastQuizIndex + 1].uri
      : '';

  const endIndex = sections.findIndex((s) => s.uri === endSecUri);
  const startIndex = sections.findIndex((s) => s.uri === startSecUri);
  if (startIndex === -1 || endIndex === -1) return null;
  if (startIndex > endIndex) {
    startSecUri = endSecUri;
  }
  return { startSecUri, endSecUri };
}

interface QuizDashboardProps {
  courseId: string;
  quizId?: string;
  onQuizIdChange?: (quizId: string) => void;
}

const QuizDashboard: NextPage<QuizDashboardProps> = ({ courseId, quizId, onQuizIdChange }) => {
  const selectedQuizId = quizId || NEW_QUIZ_ID;
  const { currentTermByCourseId, loadingTermByCourseId } = useCurrentTermContext();
  const currentTerm = currentTermByCourseId[courseId];

  const [title, setTitle] = useState<string>('');
  const [quizStartTs, setQuizStartTs] = useState<number>(roundToMinutes(Date.now()));
  const [quizEndTs, setQuizEndTs] = useState<number>(roundToMinutes(Date.now()));
  const [feedbackReleaseTs, setFeedbackReleaseTs] = useState<number>(roundToMinutes(Date.now()));
  const [courseTerm, setCourseTerm] = useState<string>('');
  const [sections, setSections] = useState<SecInfo[]>([]);
  const [coverageTimeline, setCoverageTimeline] = useState<CoverageTimeline>({});
  const [upcomingQuizSyllabus, setUpcomingQuizSyllabus] = useState<{
    startSecUri: string;
    endSecUri: string;
  }>({ startSecUri: '', endSecUri: '' });
  const [manuallySetPhase, setManuallySetPhase] = useState<Phase>(Phase.UNSET);
  const [css, setCss] = useState<FTML.Css[]>([]);
  const [quizzes, setQuizzes] = useState<QuizWithStatus[]>([]);
  const [problems, setProblems] = useState<Record<string, FTMLProblemWithSolution>>({});
  const [stats, setStats] = useState<QuizStatsResponse>({
    attemptedHistogram: {},
    scoreHistogram: {},
    requestsPerSec: {},
    perProblemStats: {},
    totalStudents: 0,
  });
  const [accessType, setAccessType] = useState<'PREVIEW_ONLY' | 'MUTATE'>();
  const [isUpdating, setIsUpdating] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [syllabusLoading, setSyllabusLoading] = useState(false);
  const isNew = isNewQuiz(selectedQuizId);

  const router = useRouter();

  const selectedQuiz = quizzes.find((quiz) => quiz.id === selectedQuizId);
  const formErrorReason = getFormErrorReason(
    quizStartTs,
    quizEndTs,
    feedbackReleaseTs,
    manuallySetPhase,
    problems,
    title,
    css
  );

  const [recorrectionDialogOpen, setRecorrectionDialogOpen] = useState(false);
  const [lectureSchedule, setLectureSchedule] = useState<LectureSchedule[]>([]);

  useEffect(() => {
    async function loadLectureSchedule() {
      try {
        const data = await getLectureEntry({ courseId, instanceId: currentTerm });
        setLectureSchedule(data.lectureSchedule || []);
      } catch (err) {
        console.error('Failed to load lecture schedule', err);
      }
    }
    if (currentTerm) loadLectureSchedule();
  }, [courseId, currentTerm]);

  useEffect(() => {
    async function fetchQuizzes() {
      if (!currentTerm) return;
      const allQuizzes: QuizWithStatus[] = await getAllQuizzes(courseId, currentTerm);
      allQuizzes?.sort((a, b) => b.quizStartTs - a.quizStartTs);
      for (const q of allQuizzes ?? []) {
        injectCss(q.css);
      }
      setQuizzes(allQuizzes);
      const validQuiz = allQuizzes.find((q) => q.id === quizId);
      if (quizId !== NEW_QUIZ_ID && (!quizId || !validQuiz) && allQuizzes.length > 0) {
        onQuizIdChange?.(allQuizzes[0].id);
      }
    }
    fetchQuizzes().catch((err) => console.error('Failed to fetch Quiz', err));
  }, [courseId, currentTerm, onQuizIdChange, quizId]);

  useEffect(() => {
    if (!selectedQuizId || selectedQuizId === NEW_QUIZ_ID || quizzes.length === 0) return;
    getQuizStats(selectedQuizId, courseId, currentTerm).then(setStats);
    const interval = setInterval(() => {
      getQuizStats(selectedQuizId, courseId, currentTerm).then(setStats);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedQuizId, courseId, currentTerm, quizzes]);

  useEffect(() => {
    if (selectedQuizId !== NEW_QUIZ_ID) return;
    const now = Date.now();
    const upcomingLecture = lectureSchedule
      .filter((lec) => lec.hasQuiz)
      .map((lec) => {
        const [sh, sm] = lec.lectureStartTime.split(':').map(Number);
        const weekdayIndex = [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ].indexOf(lec.lectureDay);
        let lectureDate = dayjs().day(weekdayIndex);
        if (lectureDate.isBefore(dayjs(), 'day')) {
          lectureDate = lectureDate.add(1, 'week');
        }

        const lectureStartMs = lectureDate.hour(sh).minute(sm).second(0).valueOf();

        return { ...lec, lectureStartMs };
      })
      .filter((lec) => lec.lectureStartMs >= now)
      .sort((a, b) => a.lectureStartMs - b.lectureStartMs)[0];

    if (!upcomingLecture) {
      const ts = roundToMinutes(Date.now());
      setQuizStartTs(ts);
      setQuizEndTs(ts);
      setFeedbackReleaseTs(ts);
      setTitle('');
      setProblems({});
      setCss([]);
      setCourseTerm(currentTerm);
      return;
    }
    const [endH, endM] = upcomingLecture.lectureEndTime.split(':').map(Number);
    const lectureStart = dayjs(upcomingLecture.lectureStartMs);
    const lectureEnd = lectureStart.hour(endH).minute(endM).second(0);
    const referenceTime =
      (upcomingLecture.quizOffsetReference || 'start') === 'start' ? lectureStart : lectureEnd;

    const quizStart = referenceTime.add(upcomingLecture.quizOffsetMinutes || 0, 'minutes');

    const quizEnd = quizStart.add(upcomingLecture.quizDurationMinutes || 0, 'minutes');
    const feedbackRelease = quizEnd.add(upcomingLecture.quizFeedbackDelayMinutes || 0, 'minutes');
    setQuizStartTs(quizStart.valueOf());
    setQuizEndTs(quizEnd.valueOf());
    setFeedbackReleaseTs(feedbackRelease.valueOf());
    setManuallySetPhase(Phase.UNSET);
    setTitle('');
    setProblems({});
    setCss([]);
    setCourseTerm(currentTerm);
  }, [selectedQuizId, lectureSchedule, currentTerm]);

  useEffect(() => {
    async function checkHasAccessAndGetTypeOfAccess() {
      if (!currentTerm) return;
      const canMutate = await canAccessResource(ResourceName.COURSE_QUIZ, Action.MUTATE, {
        courseId,
        instanceId: currentTerm,
      });
      if (canMutate) {
        setAccessType('MUTATE');
        setCanAccess(true);
        return;
      }
      const canPreview = await canAccessResource(ResourceName.COURSE_QUIZ, Action.PREVIEW, {
        courseId,
        instanceId: currentTerm,
      });
      if (canPreview) {
        setAccessType('PREVIEW_ONLY');
        setCanAccess(true);
      } else {
        setCanAccess(false);
      }
    }
    checkHasAccessAndGetTypeOfAccess();
  }, [currentTerm]);

  useEffect(() => {
    async function loadAll() {
      setSyllabusLoading(true);
      try {
        const [courseData, timelineData] = await Promise.all([
          getCourseInfo(),
          getCoverageTimeline(),
        ]);
        setCoverageTimeline(timelineData);
        const courseInfo = courseData?.[courseId];
        if (courseInfo?.notes) {
          const toc = (await contentToc({ uri: courseInfo.notes }))?.[1] ?? [];
          const formattedSections = toc.flatMap((entry) =>
            getSecInfo(entry).map(({ id, uri, title }) => ({ id, uri, title }))
          );
          setSections(formattedSections);
        }
      } catch (err) {
        console.error('Syllabus load error', err);
      } finally {
        setSyllabusLoading(false);
      }
    }
    if (courseId) {
      loadAll();
    }
  }, [courseId]);

  useEffect(() => {
    const timeline = coverageTimeline[courseId];
    const syllabus = getUpcomingQuizSyllabus(timeline, sections);
    if (syllabus) {
      setUpcomingQuizSyllabus(syllabus);
    }
  }, [coverageTimeline, courseId, sections]);

  if (!selectedQuiz && !isNew) return <>Error</>;

  async function handleDelete(quizId: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this quiz? This action cannot be undone.'
    );
    if (!confirmed) return;
    await deleteQuiz(quizId, courseId, courseTerm);
    const remainingQuizzes = quizzes.filter((quiz) => quiz.id !== quizId);
    setQuizzes(remainingQuizzes);
    const fallbackQuizId = remainingQuizzes[0]?.id || 'New';
    onQuizIdChange?.(fallbackQuizId);
  }

  if (loadingTermByCourseId || !currentTerm) return <CircularProgress />;
  if (!canAccess) return <>Unauthorized</>;

  return (
    <Box m="auto" maxWidth="800px" p="10px">
      <Box mb={2}>
        {quizzes.length > 0 && (
          <EndSemSumAccordion
            courseId={courseId}
            courseInstance={courseTerm}
            quizzes={quizzes}
            setQuizzes={setQuizzes}
          />
        )}
      </Box>
      {accessType == 'PREVIEW_ONLY' && (
        <Typography fontSize={16} color="red">
          You don&apos;t have access to mutate this course Quizzes
        </Typography>
      )}
      <Box display="flex" justifyContent={'space-between'}>
        <Select
          value={selectedQuizId}
          onChange={(e) => {
            const newQuizId = e.target.value;
            onQuizIdChange?.(newQuizId);
          }}
        >
          {accessType == 'MUTATE' ? (
            <MenuItem value="New">New</MenuItem>
          ) : (
            <MenuItem value="New">Select Quiz</MenuItem>
          )}
          {quizzes.map((quiz) => (
            <MenuItem key={quiz.id} value={quiz.id}>
              <SafeHtml html={quiz.title} />
              &nbsp;({quiz.id})
            </MenuItem>
          ))}
        </Select>
        <Button
          variant="contained"
          color="primary"
          disabled={syllabusLoading}
          onClick={() =>
            router.push({
              pathname: '/quiz-gen',
              query: {
                courseId: courseId || '',
                startSectionUri: upcomingQuizSyllabus.startSecUri,
                endSectionUri: upcomingQuizSyllabus.endSecUri,
              },
            })
          }
          startIcon={syllabusLoading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          Create Quiz
        </Button>
      </Box>

      <h2>
        {isNew && accessType == 'MUTATE'
          ? 'New Quiz'
          : selectedQuizId === 'New'
          ? ''
          : selectedQuizId}
      </h2>
      <b>
        <SafeHtml html={title} />
      </b>
      {selectedQuiz && (
        <b>
          <br />
          Current State: {getQuizPhase(selectedQuiz)}
        </b>
      )}
      <QuizDurationInfo
        quizStartTs={quizStartTs}
        quizEndTs={quizEndTs}
        feedbackReleaseTs={feedbackReleaseTs}
      />
      <CheckboxWithTimestamp
        timestamp={quizStartTs}
        setTimestamp={setQuizStartTs}
        label="Quiz start time"
      />
      <CheckboxWithTimestamp
        timestamp={quizEndTs}
        setTimestamp={setQuizEndTs}
        label="Quiz end time"
      />
      <CheckboxWithTimestamp
        timestamp={feedbackReleaseTs}
        setTimestamp={setFeedbackReleaseTs}
        label="Feedback release time"
      />
      <FormControl variant="outlined" sx={{ minWidth: '300px', m: '10px 0' }}>
        <InputLabel id="manually-set-phase-label">Manually set phase</InputLabel>
        <Select
          label="Manually Set Phase"
          labelId="manually-set-phase-label"
          value={manuallySetPhase}
          onChange={(e) => setManuallySetPhase(e.target.value as Phase)}
        >
          {Object.values(Phase).map((enumValue) => (
            <MenuItem key={enumValue} value={enumValue}>
              {enumValue}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {accessType == 'MUTATE' && (
        <QuizFileReader setCss={setCss} setTitle={setTitle} setProblems={setProblems} />
      )}
      <br />
      <i>{Object.keys(problems).length} problems found.</i>
      <br />

      {selectedQuiz && (
        <Typography sx={{ color: 'red' }} component="span" fontWeight="bold">
          {formErrorReason}
        </Typography>
      )}

      {!css?.length && Object.keys(problems).length > 0 && (
        <Typography sx={{ color: 'red' }} fontWeight="bold">
          CSS content is missing. Please try refreshing and re-uploading the quiz file.
        </Typography>
      )}
      <Box display="flex" gap={2} alignItems="center" mt={2} mb={2}>
        {accessType == 'MUTATE' && (
          <Button
            disabled={!!formErrorReason || isUpdating}
            variant="contained"
            startIcon={<UpdateIcon />}
            onClick={async (e) => {
              setIsUpdating(true);
              const quiz = {
                id: selectedQuizId,
                css,
                title,
                courseId,
                courseTerm,
                quizStartTs,
                quizEndTs,
                feedbackReleaseTs,
                manuallySetPhase,
                problems,
              } as QuizWithStatus;

              if (!isNew && stats.totalStudents > 0) {
                const originalProblems = selectedQuiz?.problems || {};
                const validation = validateQuizUpdate(
                  originalProblems,
                  problems,
                  stats.totalStudents
                );
                if (!validation.valid) {
                  if (validation.newUriFound.length > 0) {
                    alert(`Cannot update quiz: New URIs found ${validation.newUriFound[0]}`);
                  } else if (validation.notFoundURIs.length > 0) {
                    alert(`Cannot update quiz: URIs not found ${validation.notFoundURIs[0]}`);
                  }
                  setIsUpdating(false);
                  return;
                }
              }

              let resp: AxiosResponse;
              try {
                resp = await (isNew ? createQuiz(quiz) : updateQuiz(quiz));
              } catch (e) {
                alert(e);
                location.reload();
              }
              if (![200, 204].includes(resp.status)) {
                alert(`Error: ${resp.status} ${resp.statusText}`);
              } else {
                alert(`Quiz ${isNew ? 'created' : 'updated'} successfully.`);
              }
              location.reload();
            }}
          >
            {isNew ? 'Create New Quiz' : 'Update Quiz'}
          </Button>
        )}
        {accessType == 'MUTATE' && !isNew && (
          <Button
            onClick={() => handleDelete(selectedQuizId)}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
          >
            DELETE QUIZ
          </Button>
        )}
        {!isNew && accessType === 'MUTATE' && (
          <Box mt={2} mb={2}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<EditIcon />}
              onClick={() => setRecorrectionDialogOpen(true)}
            >
              Recorrection
            </Button>
            <RecorrectionDialog
              open={recorrectionDialogOpen}
              onClose={() => setRecorrectionDialogOpen(false)}
              quizId={selectedQuizId}
              courseId={courseId}
              courseTerm={courseTerm}
            />
          </Box>
        )}
      </Box>
      {!isNew && (
        <a href={`/quiz/${selectedQuizId}`} target="_blank">
          <Button variant="contained">
            Go To Quiz&nbsp;
            <OpenInNew />
          </Button>
        </a>
      )}

      {!isNew && (
        <Box mt={2} mb={2}>
          <ExcusedAccordion
            quizId={selectedQuizId}
            courseId={courseId}
            courseInstance={courseTerm}
          />
        </Box>
      )}

      <QuizStatsDisplay
        stats={stats}
        maxProblems={Object.keys(selectedQuiz?.problems || {}).length || 1}
      />
    </Box>
  );
};

export default QuizDashboard;
