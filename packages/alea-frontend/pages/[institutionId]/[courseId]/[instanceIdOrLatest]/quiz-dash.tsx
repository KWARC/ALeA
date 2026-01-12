import { SafeFTMLFragment } from '@alea/stex-react-renderer';
import { FTML, injectCss } from '@flexiformal/ftml';
import SchoolIcon from '@mui/icons-material/School';
import { Box, Button, Card, CircularProgress, Typography } from '@mui/material';
import Alert from '@mui/material/Alert';
import {
  QuizStubInfo,
  canAccessResource,
  getAllCourses,
  getCourseQuizList,
  getUserInfo,
  getLatestInstance,
  validateInstitution,
  validateInstance,
} from '@alea/spec';
import { Action, CourseInfo, ResourceName, isFauId } from '@alea/utils';
import dayjs from 'dayjs';
import { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Fragment, useEffect, useState } from 'react';
import { ForceFauLogin } from '../../../../components/ForceFAULogin';
import QuizPerformanceTable from '../../../../components/QuizPerformanceTable';
import { getLocaleObject } from '../../../../lang/utils';
import MainLayout from '../../../../layouts/MainLayout';
import { CourseHeader, handleEnrollment } from '../../../course-home/[courseId]';

function QuizThumbnail({ quiz }: { quiz: QuizStubInfo }) {
  const { quizId, quizStartTs, quizEndTs, title } = quiz;
  return (
    <Box width="fit-content">
      <Link href={`/quiz/${quizId}`}>
        <Card
          sx={{
            border: '1px solid #CCC',
            p: '10px',
            my: '10px',
            width: 'fit-content',
          }}
        >
          <Box>
            <SafeFTMLFragment
              key={title}
              fragment={{ type: 'HtmlString', html: title, uri: undefined }}
            />
          </Box>
          <Box>
            <b>
              {dayjs(quizStartTs).format('MMM-DD HH:mm')} to {dayjs(quizEndTs).format('HH:mm')}
            </b>
          </Box>
        </Card>
      </Link>
    </Box>
  );
}

function PraticeQuizThumbnail({
  courseId,
  practiceInfo,
  institutionId,
  instanceId,
}: {
  courseId: string;
  practiceInfo: { startSecNameExcl: string; endSecNameIncl: string };
  institutionId: string;
  instanceId: string;
}) {
  const { quiz: t } = getLocaleObject(useRouter());
  const { startSecNameExcl, endSecNameIncl } = practiceInfo;
  return (
    <Box width="fit-content">
      <Link
        href={`/${institutionId}/${courseId}/${instanceId}/practice-problems?startSecNameExcl=${startSecNameExcl}&endSecNameIncl=${endSecNameIncl}`}
      >
        <Card
          sx={{
            backgroundColor: 'hsl(210, 20%, 95%)',
            border: '1px solid #CCC',
            p: '10px',
            my: '10px',
            width: 'fit-content',
          }}
        >
          <Box>{t.practiceProblems}</Box>
        </Card>
      </Link>
    </Box>
  );
}

function QuizList({ header, quizList }: { header: string; quizList: QuizStubInfo[] }) {
  if (!quizList?.length) return <></>;
  return (
    <>
      <Typography variant="h5" sx={{ m: '30px 0 15px' }}>
        {header}
      </Typography>
      {quizList
        .sort((a, b) => b.quizStartTs - a.quizStartTs)
        .map((quiz) => (
          <Fragment key={quiz.quizId}>
            <QuizThumbnail quiz={quiz} />
          </Fragment>
        ))}
    </>
  );
}

function UpcomingQuizList({
  header,
  quizList,
  courseId,
  practiceInfo,
  institutionId,
  instanceId,
}: {
  header: string;
  quizList: QuizStubInfo[];
  courseId: string;
  practiceInfo?: { startSecNameExcl: string; endSecNameIncl: string };
  institutionId: string;
  instanceId: string;
}) {
  if (!quizList?.length && !practiceInfo) return null;
  return (
    <>
      <Typography variant="h5" sx={{ m: '30px 0 15px' }}>
        {header}
      </Typography>
      {quizList
        .sort((a, b) => b.quizStartTs - a.quizStartTs)
        .map((quiz) => (
          <Fragment key={quiz.quizId}>
            <QuizThumbnail quiz={quiz} />
          </Fragment>
        ))}
      {practiceInfo && <PraticeQuizThumbnail courseId={courseId} practiceInfo={practiceInfo} institutionId={institutionId} instanceId={instanceId} />}
    </>
  );
}

const PRACTICE_QUIZ_INFO = {
  'ai-1': {
    startSecNameExcl: 'Description Logics and the Semantic Web',
    endSecNameIncl: 'Partial Order Planning',
  },
};

const QuizDashPage: NextPage = () => {
  const router = useRouter();
  
  const rawInstitutionId = router.query.institutionId as string;
  const courseId = router.query.courseId as string;
  const instanceIdOrLatest = router.query.instanceIdOrLatest as string;
  
  // Normalize institutionId to uppercase
  const institutionId = rawInstitutionId?.toUpperCase() || '';
  
  const { quiz: t, home: tHome } = getLocaleObject(router);

  const [userId, setUserId] = useState<string | null>(null);
  const [quizList, setQuizList] = useState<QuizStubInfo[]>([]);
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo } | undefined>(undefined);
  const [resolvedInstanceId, setResolvedInstanceId] = useState<string | null>(null);
  const [loadingInstanceId, setLoadingInstanceId] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  const now = Date.now();
  const upcomingQuizzes = quizList.filter(({ quizStartTs }) => quizStartTs > now);
  const previousQuizzes = quizList.filter((q) => q.quizEndTs < now);
  const ongoingQuizzes = quizList.filter((q) => q.quizStartTs < now && q.quizEndTs >= now);

  const [forceFauLogin, setForceFauLogin] = useState(false);
  const [enrolled, setIsEnrolled] = useState<boolean | undefined>(undefined);

  // Redirect if case mismatch
  useEffect(() => {
    if (!router.isReady || !rawInstitutionId || !courseId || !instanceIdOrLatest) return;
    if (rawInstitutionId !== institutionId) {
      const queryString = router.asPath.includes('?') ? router.asPath.split('?')[1] : '';
      const normalizedPath = `/${institutionId}/${courseId}/${instanceIdOrLatest}/quiz-dash${queryString ? `?${queryString}` : ''}`;
      router.replace(normalizedPath);
      return;
    }
  }, [router.isReady, rawInstitutionId, institutionId, courseId, instanceIdOrLatest, router]);

  // Validate and resolve instanceId
  useEffect(() => {
    if (!router.isReady || !institutionId || !courseId || !instanceIdOrLatest) return;
    
    setIsValidating(true);
    setValidationError(null);
    
    validateInstitution(institutionId)
      .then((isValid) => {
        if (!isValid) {
          setValidationError('Invalid institutionId');
          setIsValidating(false);
          setTimeout(() => router.push('/'), 3000);
          return;
        }
        
        getAllCourses().then((allCourses) => {
          setCourses(allCourses);
          if (!allCourses[courseId]) {
            setValidationError('Invalid courseId');
            setIsValidating(false);
            setTimeout(() => router.push('/'), 3000);
            return;
          }
          
          if (instanceIdOrLatest === 'latest') {
            setLoadingInstanceId(true);
            getLatestInstance(institutionId)
              .then((latestInstanceId) => {
                setResolvedInstanceId(latestInstanceId);
                setLoadingInstanceId(false);
                setIsValidating(false);
              })
              .catch((error) => {
                console.error('Failed to fetch latest instanceId:', error);
                setValidationError('Failed to fetch latest instanceId');
                setLoadingInstanceId(false);
                setIsValidating(false);
              });
          } else {
            validateInstance(institutionId, instanceIdOrLatest)
              .then((isValidInstance) => {
                if (!isValidInstance) {
                  setValidationError('Invalid instanceId');
                  setIsValidating(false);
                  setTimeout(() => router.push('/'), 3000);
                } else {
                  setResolvedInstanceId(instanceIdOrLatest);
                  setLoadingInstanceId(false);
                  setIsValidating(false);
                }
              })
              .catch((error) => {
                console.error('Error validating instanceId:', error);
                setValidationError('Invalid instanceId');
                setIsValidating(false);
                setTimeout(() => router.push('/'), 3000);
              });
          }
        });
      })
      .catch((error) => {
        console.error('Error validating institutionId:', error);
        setValidationError('Error validating institutionId');
        setIsValidating(false);
      });
  }, [router.isReady, institutionId, courseId, instanceIdOrLatest, router]);

  useEffect(() => {
    getUserInfo().then((i) => {
      const uid = i?.userId;
      setUserId(i?.userId);
      if (!uid) return;
      isFauId(uid) ? setForceFauLogin(false) : setForceFauLogin(true);
    });
  });

  useEffect(() => {
    if (!courseId) return;
    getCourseQuizList(courseId).then((res) => {
      const quizzes = res as QuizStubInfo[];
      for (const quiz of quizzes) {
        injectCss(quiz.css);
      }
      setQuizList(quizzes);
    });
  }, [courseId]);

  useEffect(() => {
    if (!courseId || !resolvedInstanceId) return;
    const enrolledStudentActions = [{ resource: ResourceName.COURSE_QUIZ, action: Action.TAKE }];
    async function checkAccess() {
      for (const { resource, action } of enrolledStudentActions) {
        const hasAccess = await canAccessResource(resource, action, {
          courseId,
          instanceId: resolvedInstanceId,
        });
        setIsEnrolled(hasAccess);
      }
    }
    checkAccess();
  }, [courseId, resolvedInstanceId]);

  if (validationError && !isValidating && !loadingInstanceId) {
    return (
      <MainLayout title="Error | ALeA">
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (!router.isReady || !courses || isValidating || loadingInstanceId || !resolvedInstanceId) {
    return <CircularProgress />;
  }
  
  const courseInfo = courses[courseId];
  const notes = courseInfo?.notes;

  if (!courseInfo) {
    router.replace('/');
    return <>Course Not Found!</>;
  }
  
  const enrollInCourse = async () => {
    if (!userId || !courseId) {
      return router.push('/login');
    }
    const enrollmentSuccess = await handleEnrollment(userId, courseId, resolvedInstanceId);
    setIsEnrolled(enrollmentSuccess);
  };

  if (forceFauLogin) {
    return (
      <MainLayout
        title={(courseId || '').toUpperCase() + ` ${tHome.courseThumb.quizzes} | VoLL-KI`}
      >
        <ForceFauLogin content={"quizzes"}/>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={(courseId || '').toUpperCase() + ` ${tHome.courseThumb.quizzes} | VoLL-KI`}>
      <CourseHeader
        courseName={courseInfo.courseName}
        imageLink={courseInfo.imageLink}
        courseId={courseId}
      />
      <Box fragment-uri={notes} fragment-kind="Section" maxWidth="900px" m="auto" px="10px">
        {enrolled === false && <Alert severity="info">{t.enrollmentMessage}</Alert>}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', m: '30px 0 15px' }}>
          <Typography variant="h4">{t.quizDashboard}</Typography>
          {enrolled === false && (
            <Button onClick={enrollInCourse} variant="contained" sx={{ backgroundColor: 'green' }}>
              {t.getEnrolled}
              <SchoolIcon />
            </Button>
          )}
        </Box>
        <Typography variant="body1" sx={{ color: '#333' }}>
          {t.onTimeWarning.replace('{courseId}', courseId.toUpperCase())}
        </Typography>

        <Typography variant="h5" sx={{ m: '30px 0 10px' }}>
          {t.demoQuiz}
        </Typography>

        <Typography variant="body1" sx={{ color: '#333' }}>
          <a href="/quiz/quiz-a7175e81" target="_blank" rel="noreferrer" style={{ color: 'blue' }}>
            {t.this}
          </a>
          &nbsp;{t.demoQuizText}
        </Typography>

        {enrolled && (
          <>
            {' '}
            <QuizList header={t.ongoingQuizzes} quizList={ongoingQuizzes} />
            <UpcomingQuizList
              header={t.upcomingQuizzes}
              courseId={courseId}
              quizList={upcomingQuizzes}
              practiceInfo={PRACTICE_QUIZ_INFO[courseId]}
              institutionId={institutionId}
              instanceId={resolvedInstanceId}
            />
            <QuizPerformanceTable
              courseId={courseId}
              quizList={previousQuizzes}
              header={t.previousQuizzes}
            />
          </>
        )}
      </Box>
    </MainLayout>
  );
};

export default QuizDashPage;
