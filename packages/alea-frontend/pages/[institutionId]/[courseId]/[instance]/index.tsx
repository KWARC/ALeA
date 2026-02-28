import {
  Announcement,
  canAccessResource,
  CourseInfoMetadata,
  getActiveAnnouncements,
  getAllCourses,
  getCourseInfoMetadata,
  getCoverageTimeline,
  getLectureEntry,
  getLectureSchedule,
  getUserInfo,
  LectureScheduleItem,
  UserInfo,
} from '@alea/spec';
import {
  Action,
  CourseInfo,
  getCoursePdfUrl,
  INSTRUCTOR_RESOURCE_AND_ACTION,
  isFauId,
  pathToCourseResource,
  pathToCourseNotes,
  pathToCourseView,
  pathToStudyBuddy,
  pathToHomework,
  pathToPracticeProblems,
  pathToInstructorDash,
  ResourceName,
} from '@alea/utils';
import { SafeFTMLDocument } from '@alea/stex-react-renderer';
import ArticleIcon from '@mui/icons-material/Article';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import PersonIcon from '@mui/icons-material/Person';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import QuizIcon from '@mui/icons-material/Quiz';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SchoolIcon from '@mui/icons-material/School';
import SearchIcon from '@mui/icons-material/Search';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import { useTheme } from '@mui/material/styles';
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Card,
  CircularProgress,
  IconButton,
  Tooltip,
  InputAdornment,
  TextField,
  Typography,
  Grid,
} from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useCurrentUser } from '@alea/react-utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCheckAccess } from '../../../../hooks/auth/useCheckAccess';
import { CourseHeader } from '../../../../components/CourseHeader';
import { CourseNotFound } from '../../../../components/CourseNotFound';
import { RouteErrorDisplay } from '../../../../components/RouteErrorDisplay';
import InstructorDetails from '../../../../components/InstructorDetails';
import { PersonalCalendarSection } from '../../../../components/PersonalCalendar';
import { RecordedSyllabus } from '../../../../components/RecordedSyllabus';
import { handleEnrollment, handleUnEnrollment } from '../../../../components/courseHelpers';
import { useRouteValidation } from '../../../../hooks/useRouteValidation';
import { useStudentCount } from '../../../../hooks/useStudentCount';
import { getLocaleObject } from '../../../../lang/utils';
import MainLayout from '../../../../layouts/MainLayout';
import shadows from '../../../../theme/shadows';
import type { NextPage } from 'next';
import { MoreResourcesAccordion } from '../../../../components/MoreResourcesAccordion';
function CourseComponentLink({ href, children, sx }: { href: string; children: any; sx?: any }) {
  return (
    <Link href={href}>
      <Button variant="contained" sx={{ width: '100%', height: '48px', fontSize: '16px', ...sx }}>
        {children}
      </Button>
    </Link>
  );
}

function getWeekdayName(dayOfWeek: number): string {
  const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[dayOfWeek] || '';
}

function CourseScheduleSection({
  userId,
  courseId,
  currentTerm,
}: {
  userId: string | undefined;
  courseId: string;
  currentTerm: string;
}) {
  const [lectureSchedule, setLectureSchedule] = useState<LectureScheduleItem[]>([]);
  const [tutorialSchedule, setTutorialSchedule] = useState<LectureScheduleItem[]>([]);
  const [showAllLectures, setShowAllLectures] = useState(false);
  const [showAllTutorials, setShowAllTutorials] = useState(false);
  const { calendarSection: t } = getLocaleObject(useRouter());
  const hasMoreLectures = lectureSchedule.length > 3;
  const hasMoreTutorials = tutorialSchedule.length > 3;

  useEffect(() => {
    async function fetchSchedule() {
      if (!courseId || !currentTerm) return;

      const toWeekdayIndexFromName = (name?: string) => {
        if (!name) return 0;
        const n = name.trim().toLowerCase();
        if (n.startsWith('mon')) return 1;
        if (n.startsWith('tue')) return 2;
        if (n.startsWith('wed')) return 3;
        if (n.startsWith('thu')) return 4;
        if (n.startsWith('fri')) return 5;
        if (n.startsWith('sat')) return 6;
        if (n.startsWith('sun')) return 7;
        return 0;
      };

      try {
        if (typeof (getLectureEntry as any) === 'function') {
          const data = await (getLectureEntry as any)({ courseId, instanceId: currentTerm });

          const mapStoredToView = (item: any): LectureScheduleItem => ({
            dayOfWeek: toWeekdayIndexFromName(item.lectureDay || item.day || item.dayOfWeek),
            startTime: item.lectureStartTime ?? item.startTime ?? '',
            endTime: item.lectureEndTime ?? item.endTime ?? '',
            venue: item.venue,
            venueLink: item.venueLink,
          });

          const lectures = Array.isArray(data?.lectureSchedule)
            ? data.lectureSchedule.map(mapStoredToView)
            : [];
          const tutorials = Array.isArray(data?.tutorialSchedule)
            ? data.tutorialSchedule.map(mapStoredToView)
            : [];

          setLectureSchedule(lectures);
          setTutorialSchedule(tutorials);
          return;
        }

        const fallback = await getLectureSchedule(courseId, currentTerm);
        setLectureSchedule(Array.isArray(fallback) ? fallback : []);
        setTutorialSchedule([]);
      } catch (err) {
        console.error('Failed to fetch schedules', err);
        setLectureSchedule([]);
        setTutorialSchedule([]);
      }
    }

    fetchSchedule();
  }, [courseId, currentTerm]);

  const { data: nextLectureStartTime } = useQuery({
    queryKey: ['next-lecture-time', courseId, lectureSchedule, currentTerm],
    enabled: Boolean(courseId),
    retry: false,
    queryFn: () => getCoverageTimeline(),
    select: (timeline) => {
      const now = Date.now();
      const entries = (timeline[courseId!]?.lectures ?? [])
        .filter((e) => e.timestamp_ms > now)
        .sort((a, b) => a.timestamp_ms - b.timestamp_ms);

      return entries[0]?.timestamp_ms;
    },
  });

  const nextLectureDateFormatted = nextLectureStartTime
    ? new Date(nextLectureStartTime).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  const fontColor = 'text.primary';
  const theme = useTheme();
  return (
    <Box
      sx={{
        mx: 'auto',
        maxWidth: 850,
        p: { xs: 0, sm: 1 },
        borderRadius: 3,
        backgroundColor: 'background.paper',
        border: { xs: 'none', sm: `1px solid ${theme.palette.divider}` },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {lectureSchedule.length > 0 && (
            <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 300 } }}>
              <Box
                sx={{
                  px: { xs: 1, sm: 2 },
                  py: { xs: 1, sm: 1.5 },
                  borderRadius: 1,
                  bgcolor: 'secondary.main',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <CalendarMonthIcon sx={{ color: fontColor, fontSize: 20 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: fontColor, fontSize: 16 }}>
                    {t.schedule}
                  </Typography>
                </Box>

                {nextLectureDateFormatted && (
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: fontColor, fontSize: 16, mb: 1 }}
                  >
                    Upcoming Lecture: {nextLectureDateFormatted}
                  </Typography>
                )}

                <Box
                  sx={{
                    position: 'relative',
                    maxHeight: showAllLectures ? 'none' : 260,
                    overflow: 'hidden',
                  }}
                >
                  {lectureSchedule.map((entry, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        mb: 1,
                        p: 1,
                        borderRadius: 1,
                        backgroundColor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {getWeekdayName(entry.dayOfWeek)}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
                        >
                          🕒 {entry.startTime} – {entry.endTime} (Europe/Berlin)
                        </Typography>

                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          📍 Venue:{' '}
                          {entry.venueLink ? (
                            <Link
                              href={entry.venueLink}
                              target="_blank"
                              style={{ textDecoration: 'underline', color: 'primary.main' }}
                            >
                              {entry.venue}
                            </Link>
                          ) : (
                            entry.venue
                          )}
                        </Typography>
                      </Box>
                    </Box>
                  ))}

                  {!showAllLectures && hasMoreLectures && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 55,
                        background: theme.palette.gradients?.fadeBottom,
                        backdropFilter: 'blur(1.5px)',
                        WebkitBackdropFilter: 'blur(1.5px)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </Box>

                {hasMoreLectures && (
                  <Typography
                    onClick={() => setShowAllLectures(!showAllLectures)}
                    sx={{
                      cursor: 'pointer',
                      color: 'primary.main',
                      fontSize: 14,
                      mt: 1,
                      textAlign: 'center',
                    }}
                  >
                    {showAllLectures ? 'Hide all' : 'Show all'}
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {tutorialSchedule.length > 0 && (
            <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 300 } }}>
              <Box
                sx={{
                  px: { xs: 1, sm: 2 },
                  py: { xs: 1, sm: 1.5 },
                  borderRadius: 1,
                  bgcolor: 'secondary.main',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <CalendarMonthIcon sx={{ color: 'text.primary', fontSize: 20 }} />
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: 'text.primary', fontSize: 16 }}
                  >
                    Tutorial Schedule
                  </Typography>
                </Box>

                <Box
                  sx={{
                    position: 'relative',
                    maxHeight: showAllTutorials ? 'none' : 260,
                    overflow: 'hidden',
                  }}
                >
                  {tutorialSchedule.map((entry, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        mb: 1,
                        p: 1,
                        borderRadius: 1,
                        backgroundColor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {getWeekdayName(entry.dayOfWeek)}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
                        >
                          🕒 {entry.startTime} – {entry.endTime} (Europe/Berlin)
                        </Typography>

                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          📍 Venue:{' '}
                          {entry.venueLink ? (
                            <Link
                              href={entry.venueLink}
                              target="_blank"
                              style={{ textDecoration: 'underline', color: 'primary.main' }}
                            >
                              {entry.venue}
                            </Link>
                          ) : (
                            entry.venue
                          )}
                        </Typography>
                      </Box>
                    </Box>
                  ))}

                  {!showAllTutorials && hasMoreTutorials && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 55,
                        background: theme.palette.gradients?.fadeBottom,
                        backdropFilter: 'blur(1.5px)',
                        WebkitBackdropFilter: 'blur(1.5px)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </Box>

                {hasMoreTutorials && (
                  <Typography
                    onClick={() => setShowAllTutorials(!showAllTutorials)}
                    sx={{
                      cursor: 'pointer',
                      color: 'primary.main',
                      fontSize: 14,
                      mt: 1,
                      textAlign: 'center',
                    }}
                  >
                    {showAllTutorials ? 'Hide all' : 'Show all'}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </Box>

        {userId && (
          <PersonalCalendarSection
            userId={userId}
            hintGoogle={t.howToUseHintGoogle}
            hintApple={t.howToUseHintApple}
          />
        )}
      </Box>
    </Box>
  );
}

function AnnouncementsSection({ courseId, instanceId }: { courseId: string; instanceId: string }) {
  const theme = useTheme();
  const { data: announcements, isLoading: loading } = useQuery({
    queryKey: ['announcements', courseId, instanceId],
    enabled: Boolean(courseId && instanceId),
    queryFn: () => getActiveAnnouncements(courseId!, instanceId!, 'FAU'), // TODO(M5)
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  if (!announcements || announcements.length === 0) {
    return null;
  }
  return (
    <Box
      mt={3}
      sx={{
        mx: 'auto',
        maxWidth: 650,
        p: { xs: 0, sm: 1 },
      }}
    >
      <Grid container spacing={2}>
        {announcements?.map((a) => (
          <Grid item xs={12} key={`${a.courseId}-${a.createdAt}`}>
            <Card
              sx={{
                padding: 2,
                borderRadius: 2,
                boxShadow: shadows[2],
                borderLeft: `4px solid ${theme.palette.primary.main}`,
              }}
            >
              <Typography variant="body1" fontWeight="bold">
                {a.content}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Posted on {new Date(a.createdAt).toLocaleDateString()}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

const CourseHomePage: NextPage = () => {
  const router = useRouter();
  const { institutionId, courseId, instance, resolvedInstanceId, validationError, isValidating } =
    useRouteValidation('');
  const instanceId = resolvedInstanceId;
  const currentTerm = instanceId;
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [seriesId, setSeriesId] = useState<string>('');

  const studentCount = useStudentCount(courseId, currentTerm);
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!courseId || !currentTerm) return;

    async function fetchSeries() {
      try {
        const data = await getLectureEntry({ courseId, instanceId: currentTerm });
        setSeriesId(data.seriesId || '');
      } catch (e) {
        console.error('Failed to load seriesId', e);
      }
    }

    fetchSeries();
  }, [courseId, currentTerm]);
  const { user } = useCurrentUser();
  const userId = user?.userId;

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => getAllCourses(),
  });
  const { data: isEnrolled, isFetching } = useCheckAccess({
    resource: ResourceName.COURSE_QUIZ,
    action: Action.TAKE,
    variables: {
      courseId,
      instanceId: currentTerm,
    },
  });
  const enrolled = !isFetching && isEnrolled === true;

  const { data: hasInstructorAccess, isFetching: isInstructorFetching } = useQuery({
    queryKey: ['is-instructor', courseId, currentTerm],
    enabled: Boolean(courseId && currentTerm),
    retry: false,
    queryFn: async () => {
      for (const { resource, action } of INSTRUCTOR_RESOURCE_AND_ACTION) {
        const hasAccess = await canAccessResource(resource, action, {
          courseId,
          instanceId: currentTerm,
        });
        if (hasAccess) return true;
      }
      return false;
    },
  });

  const isInstructor = !isInstructorFetching && hasInstructorAccess === true;

  const { data: courseMetadata } = useQuery({
    queryKey: ['course-metadata', courseId, currentTerm],
    enabled: Boolean(courseId && currentTerm),
    queryFn: () => getCourseInfoMetadata(courseId!, currentTerm!),
  });
  if (isValidating) return null;
  if (validationError) {
    return (
      <RouteErrorDisplay
        validationError={validationError}
        institutionId={institutionId}
        courseId={courseId}
        instance={instance}
      />
    );
  }
  if (!institutionId || !courseId || !resolvedInstanceId) return <CourseNotFound />;

  if (!router.isReady || !courses) return <CircularProgress />;
  const courseInfo = courses[courseId];
  if (!courseInfo) {
    return <CourseNotFound />;
  }
  const instructorDetails =
    courseMetadata?.instructors?.map((ins) => ({
      name: ins.name,
      url: ins.url,
    })) ?? [];

  const { hasQuiz, notes, landing, slides } = courseInfo;
  const notesLink = pathToCourseNotes(institutionId, courseId, instanceId);
  const slidesLink = pathToCourseView(institutionId, courseId, instanceId);
  const cardsLink = pathToCourseResource(institutionId, courseId, instanceId, '/flash-cards');
  const forumLink = pathToCourseResource(institutionId, courseId, instanceId, '/forum');
  const quizzesLink = pathToCourseResource(institutionId, courseId, instanceId, '/quiz-dash');
  const homeworkLink = pathToHomework(institutionId, courseId, instanceId);
  const studyBuddyLink = pathToStudyBuddy(institutionId, courseId, instanceId);
  const practiceProblemsLink = pathToPracticeProblems(institutionId, courseId, instanceId);
  const instructorDashLink = pathToInstructorDash(institutionId, courseId, instanceId);

  const locale = router.locale || 'en';
  const { home, courseHome: tCourseHome, calendarSection: tCal, quiz: q } = getLocaleObject(router);
  const t = home.courseThumb;

  const showSearchBar = ['ai-1', 'ai-2', 'iwgs-1', 'iwgs-2'].includes(courseId);
  function handleSearch() {
    if (!searchQuery) return;
    router.push(`/search/${courseId}?query=${encodeURIComponent(searchQuery)}`);
  }
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const enrollInCourse = async () => {
    if (!userId || !courseId || !currentTerm) {
      return router.push('/login');
    }
    const enrollmentSuccess = await handleEnrollment(userId, courseId, currentTerm);
    if (enrollmentSuccess) {
      queryClient.invalidateQueries({
        queryKey: ['can-access', ResourceName.COURSE_QUIZ, Action.TAKE],
      });
    }
  };

  const unEnrollFromCourse = async () => {
    if (!userId || !courseId || !currentTerm) {
      return router.push('/login');
    }

    const confirmed = window.confirm('Are you sure you want to un-enroll?');
    if (!confirmed) return;
    const success = await handleUnEnrollment(userId, courseId, currentTerm);
    if (success) {
      queryClient.invalidateQueries({
        queryKey: ['can-access', ResourceName.COURSE_QUIZ, Action.TAKE],
      });
    }
  };

  return (
    <MainLayout title={(courseId || '').toUpperCase() + ` ${tCourseHome.title} | ALeA`}>
      <CourseHeader
        courseName={courseInfo.courseName}
        imageLink={courseInfo.imageLink}
        courseId={courseId}
        institutionId={institutionId}
        instanceId={instanceId}
      />

      <Box
        fragment-uri={notes}
        fragment-kind="Section"
        sx={{
          maxWidth: 900,
          margin: 'auto',
          px: 1.25,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          display="grid"
          gridTemplateColumns="repeat(auto-fill,minmax(185px, 1fr))"
          gap={1.25}
          ref={containerRef}
        >
          <ButtonGroup variant="contained" sx={{ width: '100%', height: 48 }}>
            <Button
              component={Link}
              href={notesLink}
              sx={{ flex: 1, fontSize: 16, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              {t.notes}
              <ArticleIcon fontSize="large" />
            </Button>
            {notes && (
              <Tooltip title="View as PDF" arrow>
                <Button
                  onClick={() => {
                    const pdfUrl = getCoursePdfUrl(notes);
                    window.open(pdfUrl, '_blank');
                  }}
                  sx={{ minWidth: 48, px: 1 }}
                >
                  <PictureAsPdfIcon fontSize="large" />
                </Button>
              </Tooltip>
            )}
          </ButtonGroup>
          <ButtonGroup variant="contained" sx={{ width: '100%', height: 48 }}>
            <Button
              component={Link}
              href={slidesLink}
              sx={{ flex: 1, fontSize: 16, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              {t.slides}
              <SlideshowIcon fontSize="large" />
            </Button>
            {slides && (
              <Tooltip title="View as PDF" arrow>
                <Button
                  onClick={() => {
                    const pdfUrl = getCoursePdfUrl(slides);
                    window.open(pdfUrl, '_blank');
                  }}
                  sx={{ minWidth: 48, px: 1 }}
                >
                  <PictureAsPdfIcon fontSize="large" />
                </Button>
              </Tooltip>
            )}
          </ButtonGroup>
          <CourseComponentLink href={cardsLink}>
            {t.cards}&nbsp;{' '}
            <Image src="/noun-flash-cards-2494102.svg" width={35} height={35} alt="" />
          </CourseComponentLink>
          <CourseComponentLink href={forumLink}>
            {t.forum}&nbsp;
            <QuestionAnswerIcon fontSize="large" />
          </CourseComponentLink>
          {hasQuiz && (
            <CourseComponentLink href={quizzesLink}>
              {t.quizzes}&nbsp;
              <QuizIcon fontSize="large" />
            </CourseComponentLink>
          )}
          {['lbs', 'ai-1', 'smai'].includes(courseId) && (
            <CourseComponentLink href={homeworkLink}>
              {t.homeworks}&nbsp;
              <AssignmentTurnedInIcon fontSize="large" />
            </CourseComponentLink>
          )}
          <CourseComponentLink href={studyBuddyLink}>
            {t.studyBuddy}&nbsp;
            <Diversity3Icon fontSize="large" />
          </CourseComponentLink>
          <CourseComponentLink href={practiceProblemsLink}>
            {<p>{t.practiceProblems}</p>}&nbsp;
            <Image src="/practice_problems.svg" width={35} height={35} alt="" />
          </CourseComponentLink>
          {isInstructor && (
            <CourseComponentLink href={instructorDashLink} sx={{ backgroundColor: 'blue.300' }}>
              {<p>{t.instructorDashBoard}</p>}&nbsp;
              <PersonIcon fontSize="large" />
            </CourseComponentLink>
          )}
        </Box>
        <InstructorDetails details={instructorDetails} />
        {enrolled === false && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              flexDirection: 'column',
              my: 1.25,
            }}
          >
            <Button
              onClick={enrollInCourse}
              variant="contained"
              sx={{
                backgroundColor: 'green',
                width: 'max-content',
                alignSelf: 'center',
                mb: 1.25,
              }}
            >
              {q.getEnrolled}
              <SchoolIcon />
            </Button>
            {studentCount !== null && (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                {studentCount} {q.numberofStudentEnrolled}
              </Box>
            )}
            <Alert severity="info" sx={{ display: 'flex', justifyContent: 'center' }}>
              {q.enrollmentMessage}
            </Alert>
          </Box>
        )}

        {enrolled && (
          <Box sx={{ m: 2, textAlign: 'center' }}>
            {studentCount !== null && (
              <Typography
                variant="body2"
                component="div"
                sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                You and {Math.max(studentCount - 1, 0)} other learners are enrolled.{' '}
                <Box
                  component="span"
                  onClick={unEnrollFromCourse}
                  sx={{
                    cursor: 'pointer',
                    color: 'error.main',
                    ml: 0.5,
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Un-Enroll
                </Box>
              </Typography>
            )}
          </Box>
        )}

        <AnnouncementsSection courseId={courseId} instanceId={currentTerm} />

        <CourseScheduleSection courseId={courseId} userId={userId} currentTerm={currentTerm} />
        {showSearchBar && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              maxWidth: 600,
              margin: '0 auto',
              mb: 2,
            }}
          >
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search in notes..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton>
                      <SearchIcon onClick={() => handleSearch()} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                bgcolor: 'background.paper',

                borderRadius: 7.5,

                mt: 1.25,
              }}
              onKeyDown={handleKeyDown}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Box>
        )}

        <Box bgcolor={'background.paper'}>
          <Box fragment-uri={landing} fragment-kind="Section">
            <SafeFTMLDocument
              document={{ type: 'FromBackend', uri: landing }}
              showContent={false}
              pdfLink={false}
              chooseHighlightStyle={false}
              toc="None"
            />
          </Box>
        </Box>
        <MoreResourcesAccordion
          courseId={courseId}
          semester={instance}
          institutionId={institutionId}
        />
        <RecordedSyllabus courseId={courseId} />
      </Box>
    </MainLayout>
  );
};

export default CourseHomePage;
