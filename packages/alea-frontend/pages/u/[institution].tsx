import { isUserMember } from '@alea/spec';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ArticleIcon from '@mui/icons-material/Article';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import QuizIcon from '@mui/icons-material/Quiz';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { Box, Button, Card, Chip, IconButton, Tooltip, Typography, SxProps, Theme } from '@mui/material';
import { NextPage } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useEffect, useState } from 'react';
import { useCurrentTermContext } from '../../contexts/CurrentTermContext';

import {
  CourseInfo,
  PARTNERED_UNIVERSITIES,
  UniversityDetail,
  pathToCourseHome,
  pathToCourseNotes,
  pathToCourseResource,
  pathToCourseView,
  pathToStudyBuddy,
} from '@alea/utils';
import Diversity3 from '@mui/icons-material/Diversity3';
import { getLocaleObject } from '../../lang/utils';
import MainLayout from '../../layouts/MainLayout';
import { getAllCoursesFromDb } from '../api/get-all-courses';

function ColoredIconButton({ children }: { children: ReactNode }) {
  return (
    <IconButton
      sx={{
        bgcolor: 'primary.main',
        '&:hover, &.Mui-focusVisible': { bgcolor: 'primary.dark' },
      }}
    >
      {children}
    </IconButton>
  );
}

function EmptyStateCard({ title, message }: { title: string; message: string }) {
  return (
    <Card sx={emptyStateCardStyles.card}>
      <MenuBookIcon sx={emptyStateCardStyles.icon} />
      <Typography variant="h5" fontWeight="bold" color="text.primary">
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Card>
  );
}

export function CourseThumb({
  course,
  institutionId,
}: {
  course: CourseInfo;
  institutionId?: string;
}) {
  const router = useRouter();
  const { home } = getLocaleObject(router);
  const t = home.courseThumb;
  const { courseId, courseName, imageLink, hasQuiz } = course;
  const inst = institutionId ?? course.universityId ?? 'FAU';
  const instance = 'latest';
  const homeHref = pathToCourseHome(inst, courseId, instance);
  const notesLink = pathToCourseNotes(inst, courseId, instance);
  const slidesLink = pathToCourseView(inst, courseId, instance);
  const cardsLink = pathToCourseResource(inst, courseId, instance, '/flash-cards');
  const forumLink = pathToCourseResource(inst, courseId, instance, '/forum');
  const quizzesLink = pathToCourseResource(inst, courseId, instance, '/quiz-dash');
  const studyBuddyLink = pathToStudyBuddy(inst, courseId, instance);
  const width = courseId === 'iwgs-1' ? 83 : courseId === 'iwgs-2' ? 165 : 200;
  return (
    <Card
      sx={{
        bgcolor: 'background.card',
        border: '1px solid ',
        borderColor: 'divider',
        p: 1.25,
        m: 1.25,
        maxWidth: 252,
        position: 'relative',
      }}
    >
      {course.isCurrent && (
        <Chip
          label="Active"
          color="success"
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: '#16a34a',
            color: '#fff',
            fontWeight: 700,
            boxShadow: '0 4px 10px rgba(22, 163, 74, 0.35)',
          }}
        />
      )}
      <Box display="flex" flexDirection="column" justifyContent="space-between" height="100%">
        <Box display="flex" flexDirection="column" alignItems="center">
          <Link href={homeHref} style={{ textAlign: 'center' }}>
            <Image
              src={imageLink}
              width={width}
              height={100}
              alt={courseName}
              style={{ display: 'block', margin: 'auto' }}
              priority={true}
            />
            <Typography
              component="span"
              sx={{ fontSize: 16, mt: 0.6, fontWeight: 'bold', fontFamily: 'Latin Modern' }}
            >
              {courseName.length > 50 ? courseId.toUpperCase() : courseName}
            </Typography>
          </Link>
        </Box>
        <Box display="flex" justifyContent="space-between" mt={0.6} gap={0.6} flexWrap="wrap">
          <Tooltip title={t.notes}>
            <Link href={notesLink} passHref>
              <Button size="small" variant="contained">
                {t.notes}&nbsp;
                <ArticleIcon />
              </Button>
            </Link>
          </Tooltip>

          <Tooltip title={t.slides}>
            <Link href={slidesLink} passHref>
              <Button size="small" variant="contained">
                {t.slides}&nbsp;
                <SlideshowIcon />
              </Button>
            </Link>
          </Tooltip>

          <Tooltip title={home.cardIntro}>
            <Link href={cardsLink} passHref>
              <ColoredIconButton>
                <Image src="/noun-flash-cards-2494102.svg" width={25} height={25} alt="" />
              </ColoredIconButton>
            </Link>
          </Tooltip>

          <Tooltip title={t.forum}>
            <Link href={forumLink} passHref>
              <ColoredIconButton>
                <QuestionAnswerIcon htmlColor="white" />
              </ColoredIconButton>
            </Link>
          </Tooltip>

          {
            <Tooltip title={t.quizzes}>
              <Link href={quizzesLink} passHref>
                <ColoredIconButton>
                  <QuizIcon htmlColor="white" />
                </ColoredIconButton>
              </Link>
            </Tooltip>
          }

          <Tooltip title={t.studyBuddy}>
            <Link href={studyBuddyLink} passHref>
              <ColoredIconButton>
                <Diversity3 htmlColor="white" />
              </ColoredIconButton>
            </Link>
          </Tooltip>
        </Box>
      </Box>
    </Card>
  );
}

const StudentHomePage: NextPage = ({
  courses,
  locale,
}: {
  courses: { [id: string]: CourseInfo };
  locale: string;
}) => {
  const router = useRouter();
  const { query } = router;
  const { home: t, studyBuddy: s } = getLocaleObject({ locale });
  const institution = query.institution as string;
  const { currentTermByUniversityId } = useCurrentTermContext();
  const currentTerm = currentTermByUniversityId[institution];
  const [isUniversityAdmin, setIsUniversityAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!institution || institution === 'others') {
      setIsUniversityAdmin(false);
      return;
    }
    isUserMember(`${institution.toLowerCase()}-admin`).then(setIsUniversityAdmin);
  }, [institution]);

  if (!courses) return null;
  return (
    <MainLayout title="Courses | ALeA" bgColor="page.background">
      <Box sx={{ bgcolor: 'page.background', px: { xs: 2, sm: 3 }, py: { xs: 3, md: 4 } }}>
        <Box m="0 auto" maxWidth={860}>
          <Box
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              mb: 3,
              pb: 1.5,
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <Image
                src={UniversityDetail[institution]?.logo}
                alt={UniversityDetail[institution]?.fullName}
                width={96}
                height={42}
                style={{ objectFit: 'contain' }}
              />
              <Box>
                <Typography component="h1" sx={{ color: 'text.primary', fontSize: 22, fontWeight: 800 }}>
                  {UniversityDetail[institution]?.fullName}
                </Typography>
              </Box>
            </Box>
            <Box display="flex" gap={1} flexWrap="wrap" mt={2}>
              <Link href="/study-buddy">
                <Tooltip title={<Box sx={{ fontSize: 'medium' }}>{t.studyBuddyTooltip}</Box>}>
                  {institution === 'FAU' ? (
                    <Button variant="contained">{s.studyBuddyMasterCourse}</Button>
                  ) : null}
                </Tooltip>
              </Link>
              {isUniversityAdmin && institution !== 'others' && (
                <Link href={`/u/${institution}/university-admin`}>
                  <Tooltip title="Go to University Admin page">
                    <Button variant="outlined" startIcon={<AdminPanelSettingsIcon />}>
                      University Admin
                    </Button>
                  </Tooltip>
                </Link>
              )}
            </Box>
          </Box>

          <Typography component="h2" sx={institutionPageStyles.sectionHeading}>
            {currentTerm && currentTerm !== 'null'
              ? `${t.courseSection} (${currentTerm})`
              : t.courseSection}
          </Typography>
          <Box display="flex" flexWrap="wrap" justifyContent={{ xs: 'center', md: 'flex-start' }}>
            {Object.values(courses).filter((course) => course.isCurrent).length > 0 ? (
              Object.values(courses)
                .filter((course) => course.isCurrent)
                .map((c) => (
                  <CourseThumb key={c.courseId} course={c} institutionId={institution} />
                ))
            ) : (
              <EmptyStateCard
                title={t.noActiveCourses}
                message={`${t.noActiveCoursesMsg} ${
                  UniversityDetail[institution]?.fullName || 'this institution'
                }.`}
              />
            )}
          </Box>

          {Object.values(courses).filter((course) => !course.isCurrent).length > 0 && (
            <>
              <Typography component="h2" sx={{ ...institutionPageStyles.sectionHeading, mt: 4 }}>
                {t.otherCourses}
              </Typography>
              <Box
                display="flex"
                flexWrap="wrap"
                justifyContent={{ xs: 'center', md: 'flex-start' }}
              >
                {Object.values(courses)
                  .filter((course) => !course.isCurrent)
                  .map((c) => (
                    <CourseThumb key={c.courseId} course={c} institutionId={institution} />
                  ))}
              </Box>
            </>
          )}
        </Box>
      </Box>
    </MainLayout>
  );
};

export default StudentHomePage;

const emptyStateCardStyles: Record<'card' | 'icon', SxProps<Theme>> = {
  card: {
    bgcolor: 'background.card',
    border: '1px solid',
    borderColor: 'divider',
    p: 4,
    m: 1.25,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 2,
    borderRadius: 2,
  },
  icon: {
    fontSize: 60,
    color: 'text.secondary',
    opacity: 0.5,
  },
};

const institutionPageStyles: Record<'sectionHeading', SxProps<Theme>> = {
  sectionHeading: {
    color: 'text.primary',
    fontSize: 28,
    fontWeight: 800,
    mb: 1.5,
  },
};

export async function getStaticPaths() {
  const languages = ['en', 'de'];
  const paths = [];
  languages.forEach((lang) => {
    Object.keys(UniversityDetail).forEach((key) => {
      paths.push({
        params: { institution: key },
        locale: lang,
      });
    });
    paths.push({
      params: { institution: 'others' },
      locale: lang,
    });
  });
  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps({ params, locale }) {
  if (!params || !params.institution) {
    return {
      props: {
        courses: null,
      },
    };
  }
  const allCourses = await getAllCoursesFromDb();

  const courses =
    params.institution === 'others'
      ? Object.keys(allCourses)
          .filter(
            (key) =>
              !PARTNERED_UNIVERSITIES.map((uni) => uni.code).includes(allCourses[key].universityId)
          )
          .map((key) => allCourses[key])
      : await getAllCoursesFromDb(params.institution);

  return {
    props: {
      courses,
      locale,
    },
    revalidate: 3600,
  };
}
