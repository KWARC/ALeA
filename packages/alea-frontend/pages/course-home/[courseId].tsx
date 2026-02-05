import {
  addRemoveMember,
  Announcement,
  canAccessResource,
  CourseInfoMetadata,
  getActiveAnnouncements,
  getAllCourses,
  getCourseInfoMetadata,
  getCoverageTimeline,
  getLectureEntry,
  getLectureSchedule,
  LectureScheduleItem,
} from '@alea/spec';
import { SafeFTMLDocument } from '@alea/stex-react-renderer';
import {
  Action,
  BG_COLOR,
  CourseInfo,
  getCoursePdfUrl,
  INSTRUCTOR_RESOURCE_AND_ACTION,
  isFauId,
  ResourceName,
} from '@alea/utils';
import ArticleIcon from '@mui/icons-material/Article';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import PersonIcon from '@mui/icons-material/Person';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import QuizIcon from '@mui/icons-material/Quiz';
import SchoolIcon from '@mui/icons-material/School';
import SearchIcon from '@mui/icons-material/Search';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Card,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { NextPage } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import InstructorDetails from '../../components/InstructorDetails';
import { PersonalCalendarSection } from '../../components/PersonalCalendar';
import { RecordedSyllabus } from '../../components/RecordedSyllabus';
import { useCurrentTermContext } from '../../contexts/CurrentTermContext';
import { useCurrentUser } from '@alea/react-utils';
import { useStudentCount } from '../../hooks/useStudentCount';
import { getLocaleObject } from '../../lang/utils';
import MainLayout from '../../layouts/MainLayout';

export function getCourseEnrollmentAcl(courseId: string, instanceId: string) {
  return `${courseId}-${instanceId}-enrollments`;
}
export async function handleEnrollment(userId: string, courseId: string, currentTerm: string) {
  if (!userId || !isFauId(userId)) {
    alert('Please Login Using FAU Id.');
    return false;
  }

  try {
    await addRemoveMember({
      memberId: userId,
      aclId: getCourseEnrollmentAcl(courseId, currentTerm),
      isAclMember: false,
      toBeAdded: true,
    });
    alert('Enrollment successful!');
    return true;
  } catch (error) {
    console.error('Error during enrollment:', error);
    alert('Enrollment failed. Please try again.');
    return false;
  }
}

export async function handleUnEnrollment(userId: string, courseId: string, currentTerm: string) {
  if (!userId || !isFauId(userId)) {
    alert('Please Login Using FAU Id.');
    return false;
  }

  try {
    await addRemoveMember({
      memberId: userId,
      aclId: getCourseEnrollmentAcl(courseId, currentTerm),
      isAclMember: false,
      toBeAdded: false,
    });

    alert('You have been unenrolled.');
    return true;
  } catch (error) {
    console.error('Error during unenrollment:', error);
    alert('Unable to unenroll. Please try again.');
    return false;
  }
}

function CourseComponentLink({ href, children, sx }: { href: string; children: any; sx?: any }) {
  return (
    <Link href={href}>
      <Button variant="contained" sx={{ width: '100%', height: '48px', fontSize: '16px', ...sx }}>
        {children}
      </Button>
    </Link>
  );
}

const BG_COLORS = {
  'iwgs-1': 'linear-gradient(to right, #00010e, #060844)',
  'iwgs-2': 'radial-gradient(circle, #5b6956, #8f9868)',
  krmt: 'radial-gradient(circle, white, #f5f5b7)',
  gdp: 'radial-gradient(circle, #4bffd7, #a11cff)',
  rip: 'radial-gradient(circle, #fcef6e, #3f2e86)',
  spinf: 'radial-gradient(circle, #b2bbc0, #184e6d)',
};

export function CourseHeader({
  courseId,
  courseName,
  imageLink,
}: {
  courseId: string;
  courseName: string;
  imageLink?: string;
}) {
  if (!courseName || !courseId) return <></>;
  if (!imageLink) {
    return (
      <Box m="20px" textAlign="center" fontWeight="bold" fontSize="32px">
        {courseName}
      </Box>
    );
  }
  const allowCrop = ['ai-1', 'ai-2', 'lbs', 'smai'].includes(courseId);
  return (
    <Box textAlign="center">
      <Link href={`/course-home/${courseId}`}>
        <Box
          display="flex"
          position="relative"
          width="100%"
          maxHeight="200px"
          overflow="hidden"
          borderBottom="2px solid #DDD"
          sx={{ backgroundImage: BG_COLORS[courseId] }}
        >
          {allowCrop ? (
            <img
              src={imageLink}
              alt={courseName}
              style={{
                objectFit: 'cover',
                width: '100%',
                aspectRatio: '16/9',
              }}
            />
          ) : (
            <img
              src={imageLink}
              alt={courseName}
              style={{
                objectFit: 'contain',
                maxHeight: '200px',
                margin: 'auto',
              }}
            />
          )}
        </Box>
      </Link>
      <Box m="20px 0 32px" fontWeight="bold" fontSize="32px">
        {courseName}
      </Box>
    </Box>
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
  const [nextLectureStartTime, setNextLectureStartTime] = useState<number | null>(null);
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

  useEffect(() => {
    async function fetchNextLectureDates() {
      try {
        const timeline = await getCoverageTimeline();
        const now = Date.now();

        const lectureEntries = Array.isArray(timeline[courseId])
          ? timeline[courseId]
          : timeline[courseId]?.lectures ?? [];

        const entries = lectureEntries
          .filter((e) => e.timestamp_ms && e.timestamp_ms > now)
          .sort((a, b) => a.timestamp_ms - b.timestamp_ms);
        setNextLectureStartTime(entries[0]?.timestamp_ms);
      } catch (error) {
        console.error('Failed to fetch lecture timeline:', error);
      }
    }

    if (courseId) fetchNextLectureDates();
  }, [courseId, lectureSchedule, currentTerm]);
  const nextLectureDateFormatted = nextLectureStartTime
    ? new Date(nextLectureStartTime).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  const fontColor = '#01453d';
  return (
    <Box
      sx={{
        mx: 'auto',
        maxWidth: '850px',
        p: { xs: 0, sm: 1 },
        borderRadius: '12px',
        backgroundColor: '#f8f9fa',
        border: { xs: 'none', sm: '1px solid #e0e0e0' },
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
                  background: 'linear-gradient(135deg, #e8f5e8, #f0f9ff)',
                  border: '1px solid #b2dfdb',
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
                        backgroundColor: '#fff',
                        border: '1px solid #e0f2f1',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#004d40' }}>
                          {getWeekdayName(entry.dayOfWeek)}
                        </Typography>

                        <Typography variant="body2" sx={{ color: '#00695c', whiteSpace: 'nowrap' }}>
                          🕒 {entry.startTime} – {entry.endTime} (Europe/Berlin)
                        </Typography>

                        <Typography variant="body2" sx={{ color: '#00695c' }}>
                          📍 Venue:{' '}
                          {entry.venueLink ? (
                            <Link
                              href={entry.venueLink}
                              target="_blank"
                              style={{ textDecoration: 'underline', color: '#004d40' }}
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
                        background: `linear-gradient( to bottom,rgba(248,249,250,0) 0%, rgba(248,249,250,0.4) 35%, rgba(248,249,250,0.75) 100%)`,
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
                      color: '#42a5f5',
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
                  background: 'linear-gradient(135deg, #e8f5e8, #f0f9ff)',
                  border: '1px solid #ffe0b2',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <CalendarMonthIcon sx={{ color: '#004d40', fontSize: 20 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#004d40', fontSize: 16 }}>
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
                        backgroundColor: '#fff',
                        border: '1px solid #e0f2f1',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#004d40' }}>
                          {getWeekdayName(entry.dayOfWeek)}
                        </Typography>

                        <Typography variant="body2" sx={{ color: '#00695c', whiteSpace: 'nowrap' }}>
                          🕒 {entry.startTime} – {entry.endTime} (Europe/Berlin)
                        </Typography>

                        <Typography variant="body2" sx={{ color: '#00695c' }}>
                          📍 Venue:{' '}
                          {entry.venueLink ? (
                            <Link
                              href={entry.venueLink}
                              target="_blank"
                              style={{ textDecoration: 'underline', color: '#004d40' }}
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
                        background: `linear-gradient(to bottom,rgba(248,249,250,0) 0%, rgba(248,249,250,0.4) 35%, rgba(248,249,250,0.75) 100%)`,
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
                      color: '#42a5f5',
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
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const fetchedAnnouncements = await getActiveAnnouncements(courseId, instanceId, 'FAU'); // TODO(M5)
        setAnnouncements(fetchedAnnouncements);
      } catch (e) {
        setError('Failed to fetch announcements.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchAnnouncements();
  }, [courseId, instanceId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  if (!announcements?.length) return null;

  return (
    <Box
      mt={3}
      sx={{
        mx: 'auto',
        maxWidth: '650px',
        p: { xs: 0, sm: 1 },
      }}
    >
      <Grid container spacing={2}>
        {announcements?.map((a) => (
          <Grid item xs={12} key={`${a.courseId}-${a.createdAt}`}>
            <Card
              sx={{
                padding: 2,
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                borderLeft: '4px solid #1976d2',
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
  const containerRef = useRef<HTMLDivElement>(null);
  const courseId = router.query.courseId as string;
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo } | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInstructor, setIsInstructor] = useState(false);
  const [enrolled, setIsEnrolled] = useState<boolean | undefined>(undefined);
  const [seriesId, setSeriesId] = useState<string>('');
  const { currentTermByCourseId } = useCurrentTermContext();
  const currentTerm = currentTermByCourseId[courseId];

  const studentCount = useStudentCount(courseId, currentTerm);
  const [courseMetadata, setCourseMetadata] = useState<CourseInfoMetadata | null>(null);

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

  useEffect(() => {
    getAllCourses().then(setCourses);
  }, []);

  useEffect(() => {
    if (!courseId || !currentTerm) return;
    const checkAccess = async () => {
      const hasAccess = await canAccessResource(ResourceName.COURSE_QUIZ, Action.TAKE, {
        courseId,
        instanceId: currentTerm,
      });
      setIsEnrolled(hasAccess);
    };
    checkAccess();
  }, [courseId, currentTerm]);

  useEffect(() => {
    if (!courseId || !currentTerm) return;

    async function checkAccess() {
      for (const { resource, action } of INSTRUCTOR_RESOURCE_AND_ACTION) {
        const hasAccess = await canAccessResource(resource, action, {
          courseId,
          instanceId: currentTerm,
        });
        if (hasAccess) {
          setIsInstructor(true);
          return;
        }
      }
    }
    checkAccess();
  }, [courseId, currentTerm]);

  useEffect(() => {
    if (!courseId || !currentTerm) return;

    async function loadMetadata() {
      try {
        const info = await getCourseInfoMetadata(courseId, currentTerm);
        setCourseMetadata(info);
      } catch (e) {
        console.error('filled to load metadata', e);
        setCourseMetadata(null);
      }
    }
    loadMetadata();
  }, [courseId, currentTerm]);

  if (!router.isReady || !courses) return <CircularProgress />;
  const courseInfo = courses[courseId];
  if (!courseInfo) {
    router.replace('/');
    return <>Course Not Found!</>;
  }
  const instructorDetails =
    courseMetadata?.instructors?.map((ins) => ({
      name: ins.name,
      url: ins.url,
    })) ?? [];

  const {
    notesLink,
    slidesLink,
    cardsLink,
    forumLink,
    quizzesLink,
    hasQuiz,
    notes,
    landing,
    slides,
  } = courseInfo;

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
    setIsEnrolled(enrollmentSuccess);
  };

  const unEnrollFromCourse = async () => {
    if (!userId || !courseId || !currentTerm) {
      return router.push('/login');
    }

    const confirmed = window.confirm('Are you sure you want to un-enroll?');
    if (!confirmed) return;

    const success = await handleUnEnrollment(userId, courseId, currentTerm);
    if (success) {
      setIsEnrolled(false);
    }
  };

  return (
    <MainLayout
      title={(courseId || '').toUpperCase() + ` ${tCourseHome.title} | ALeA`}
      bgColor={BG_COLOR}
    >
      <CourseHeader
        courseName={courseInfo.courseName}
        imageLink={courseInfo.imageLink}
        courseId={courseId}
      />

      <Box
        fragment-uri={notes}
        fragment-kind="Section"
        sx={{
          maxWidth: '900px',
          margin: 'auto',
          px: '1.25',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          display="grid"
          gridTemplateColumns="repeat(auto-fill,minmax(185px, 1fr))"
          gap="10px"
          ref={containerRef}
        >
          <ButtonGroup variant="contained" sx={{ width: '100%', height: '48px' }}>
            <Button
              component={Link}
              href={notesLink}
              sx={{ flex: 1, fontSize: '16px', display: 'flex', alignItems: 'center', gap: 1 }}
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
                  sx={{ minWidth: '48px', px: 1 }}
                >
                  <PictureAsPdfIcon fontSize="large" />
                </Button>
              </Tooltip>
            )}
          </ButtonGroup>
          <ButtonGroup variant="contained" sx={{ width: '100%', height: '48px' }}>
            <Button
              component={Link}
              href={slidesLink}
              sx={{ flex: 1, fontSize: '16px', display: 'flex', alignItems: 'center', gap: 1 }}
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
                  sx={{ minWidth: '48px', px: 1 }}
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
            <CourseComponentLink href={`/homework/${courseId}`}>
              {t.homeworks}&nbsp;
              <AssignmentTurnedInIcon fontSize="large" />
            </CourseComponentLink>
          )}
          <CourseComponentLink href={`/study-buddy/${courseId}`}>
            {t.studyBuddy}&nbsp;
            <Diversity3Icon fontSize="large" />
          </CourseComponentLink>
          <CourseComponentLink href={`/practice-problems/${courseId}`}>
            {<p>{t.practiceProblems}</p>}&nbsp;
            <Image src="/practice_problems.svg" width={35} height={35} alt="" />
          </CourseComponentLink>
          {isInstructor && (
            <CourseComponentLink
              href={`/instructor-dash/${courseId}`}
              sx={{ backgroundColor: '#4565af' }}
            >
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
              marginTop: '10px',
            }}
          >
            <Button
              onClick={enrollInCourse}
              variant="contained"
              sx={{
                backgroundColor: 'green',
                width: 'max-content',
                alignSelf: 'center',
                marginBottom: '10px',
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
                    color: '#b00020',
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
              maxWidth: '600px',
              margin: '0 auto',
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
                backgroundColor: 'white',
                borderRadius: '30px',
                mt: '10px',
              }}
              onKeyDown={handleKeyDown}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Box>
        )}
        <Box fragment-uri={landing} fragment-kind="Section">
          <SafeFTMLDocument
            document={{ type: 'FromBackend', uri: landing }}
            showContent={false}
            pdfLink={false}
            chooseHighlightStyle={false}
            toc="None"
          />
        </Box>
        <RecordedSyllabus courseId={courseId} />
      </Box>
    </MainLayout>
  );
};
export default CourseHomePage;
