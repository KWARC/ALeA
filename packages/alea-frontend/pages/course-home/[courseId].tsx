import { FTMLDocument } from '@kwarc/ftml-react';
import ArticleIcon from '@mui/icons-material/Article';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import PersonIcon from '@mui/icons-material/Person';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import QuizIcon from '@mui/icons-material/Quiz';
import SchoolIcon from '@mui/icons-material/School';
import SearchIcon from '@mui/icons-material/Search';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import {
  addRemoveMember,
  canAccessResource,
  getCourseInfo,
  getCoverageTimeline,
  getUserInfo,
  UserInfo,
} from '@stex-react/api';
import {
  Action,
  BG_COLOR,
  CourseInfo,
  CURRENT_TERM,
  INSTRUCTOR_RESOURCE_AND_ACTION,
  isFauId,
  ResourceName,
  semesterPeriods,
} from '@stex-react/utils';
import { NextPage } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PersonalCalendarSection } from '../../components/PersonalCalendar';
import { RecordedSyllabus } from '../../components/RecordedSyllabus';
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

export function ExamSchedule({ examDates }) {
  if (!examDates?.length) return null;

  const timeZone = 'Europe/Berlin';

  return (
    <Box
      sx={{
        px: { xs: 1, sm: 2 },
        py: { xs: 1, sm: 1.5 },
        mt: 2,
        borderRadius: '8px',
        background: 'linear-gradient(135deg, #fff3e0, #ffe0b2)',
        border: '1px solid #ffcc80',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <QuizIcon sx={{ color: '#bf360c', fontSize: '20px' }} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#bf360c', fontSize: '1rem' }}>
          Exam Schedule
        </Typography>
      </Box>

      {examDates.map((exam, idx) => {
        const hasTime = exam.examStartTime && exam.examEndTime;
        const start = new Date(`${exam.examDate}T${exam.examStartTime || '00:00'}:00+02:00`);  //+02:00 is used because we assume Europe/Berlin time.
        const end = new Date(`${exam.examDate}T${exam.examEndTime || '00:00'}:00+02:00`);

        const formattedDate = start.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone,
        });

        const formattedStart = hasTime
          ? start.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone,
            })
          : '';

        const formattedEnd = hasTime
          ? end.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone,
            })
          : '';

        return (
          <Typography key={idx} variant="body2" sx={{ color: '#e65100', mb: 1, fontWeight: 500 }}>
            🗓 {formattedDate}
            {hasTime && ` ⏰ ${formattedStart} – ${formattedEnd} (${timeZone})`}
          </Typography>
        );
      })}
    </Box>
  );
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
  const days = [
    '', // index 0 is unused
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  return days[dayOfWeek] || '';
}
function CourseScheduleSection({
  userId,
  courseId,
}: {
  userId: string | undefined;
  courseId: string;
}) {
  const [nextLectureStartTime, setNextLectureStartTime] = useState<number | null>(null);
  const { calendarSection: t } = getLocaleObject(useRouter());

  const courseSchedule = useMemo(
    () => semesterPeriods[CURRENT_TERM]?.courses.filter((c) => c.courseId === courseId) || [],
    [courseId]
  );

  const examDates = semesterPeriods[CURRENT_TERM]?.examDates.filter((e) => e.courseId === courseId) || [];

  useEffect(() => {
    async function fetchNextLectureDates() {
      try {
        const timeline = await getCoverageTimeline();
        const now = Date.now();
        const entries = (timeline[courseId] || [])
          .filter((e) => e.timestamp_ms && e.timestamp_ms > now)
          .sort((a, b) => a.timestamp_ms - b.timestamp_ms);
        setNextLectureStartTime(entries[0].timestamp_ms);
      } catch (error) {
        console.error('Failed to fetch lecture timeline:', error);
      }
    }

    if (courseId) fetchNextLectureDates();
  }, [courseId, courseSchedule]);
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
        mt: 3,
        mx: 'auto',
        maxWidth: '650px',
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
        {courseSchedule.length > 0 && (
          <Box
            sx={{
              px: { xs: 1, sm: 2 },
              py: { xs: 1, sm: 1.5 },
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #e8f5e8, #f0f9ff)',
              border: '1px solid #b2dfdb',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <CalendarMonthIcon sx={{ color: fontColor, fontSize: '20px' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: fontColor, fontSize: '1rem' }}>
                {t.schedule}
              </Typography>
            </Box>
            {nextLectureDateFormatted && (
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: fontColor, fontSize: '1rem', mb: 1 }}
              >
                Upcoming Lecture: {nextLectureDateFormatted}
              </Typography>
            )}
            {courseSchedule.map((entry, idx) => {
              const isNext = false; //entry.dayOfWeek === nextLectureDay; Re-enable after fixing timezone issues.
              return (
                <Box
                  key={idx}
                  sx={{
                    mb: 1,
                    p: 1,
                    borderRadius: '6px',
                    backgroundColor: isNext ? '#e1f5fe' : '#ffffff',
                    border: isNext ? '2px solid #0288d1' : '1px solid #e0f2f1',
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
                      📍Venue:{' '}
                      {entry.venueLink ? (
                        <a
                          href={entry.venueLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: 'underline', color: '#004d40' }}
                        >
                          {entry.venue}
                        </a>
                      ) : (
                        entry.venue
                      )}
                    </Typography>
                    {courseSchedule.length > 1 && isNext && (
                      <Typography
                        component="span"
                        sx={{
                          ml: 1,
                          px: 1,
                          py: 0.25,
                          backgroundColor: '#2196f3',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          animation: 'pulse 2s infinite',
                          '@keyframes pulse': {
                            '50%': { transform: 'scale(1.1)' },
                          },
                        }}
                      >
                        Upcoming Lecture
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

       <ExamSchedule examDates={examDates} />


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

const CourseHomePage: NextPage = () => {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const courseId = router.query.courseId as string;
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo } | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInstructor, setIsInstructor] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [enrolled, setIsEnrolled] = useState<boolean | undefined>(undefined);
  const studentCount = useStudentCount(courseId, CURRENT_TERM);

  useEffect(() => {
    getUserInfo().then((userInfo: UserInfo) => {
      setUserId(userInfo?.userId);
    });
  }, []);

  useEffect(() => {
    getCourseInfo().then(setCourses);
  }, []);

  useEffect(() => {
    if (!courseId) return;
    const checkAccess = async () => {
      const hasAccess = await canAccessResource(ResourceName.COURSE_QUIZ, Action.TAKE, {
        courseId,
        instanceId: CURRENT_TERM,
      });
      setIsEnrolled(hasAccess);
    };
    checkAccess();
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;

    async function checkAccess() {
      for (const { resource, action } of INSTRUCTOR_RESOURCE_AND_ACTION) {
        const hasAccess = await canAccessResource(resource, action, {
          courseId,
          instanceId: CURRENT_TERM,
        });
        if (hasAccess) {
          setIsInstructor(true);
          return;
        }
      }
    }
    checkAccess();
  }, [courseId]);

  if (!router.isReady || !courses) return <CircularProgress />;
  const courseInfo = courses[courseId];
  if (!courseInfo) {
    router.replace('/');
    return <>Course Not Found!</>;
  }

  const { notesLink, slidesLink, cardsLink, forumLink, quizzesLink, hasQuiz, notes, landing } =
    courseInfo;

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
    if (!userId || !courseId) {
      return router.push('/login');
    }
    const enrollmentSuccess = await handleEnrollment(userId, courseId, CURRENT_TERM);
    setIsEnrolled(enrollmentSuccess);
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
          px: '10px',
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
          <CourseComponentLink href={notesLink}>
            {t.notes}&nbsp;
            <ArticleIcon fontSize="large" />
          </CourseComponentLink>
          <CourseComponentLink href={slidesLink}>
            {t.slides}&nbsp;
            <SlideshowIcon fontSize="large" />
          </CourseComponentLink>
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
        <CourseScheduleSection courseId={courseId} userId={userId} />
        <br />
        {showSearchBar && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              padding: '10px',
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
          <FTMLDocument document={{ type: 'FromBackend', uri: landing, toc: undefined }} />
        </Box>
        <RecordedSyllabus courseId={courseId} />
      </Box>
    </MainLayout>
  );
};
export default CourseHomePage;
