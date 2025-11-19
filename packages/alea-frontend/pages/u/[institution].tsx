import ArticleIcon from '@mui/icons-material/Article';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import QuizIcon from '@mui/icons-material/Quiz';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import { Box, Button, Card, IconButton, Tooltip, Typography } from '@mui/material';
import { getAllCourses } from '@alea/spec';
import { CourseInfo, PRIMARY_COL, PRIMARY_COL_DARK_HOVER } from '@alea/utils';
import { NextPage } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useEffect } from 'react';
import { useCurrentTermContext } from '../../contexts/CurrentTermContext';

import Diversity3 from '@mui/icons-material/Diversity3';
import { getLocaleObject } from '../../lang/utils';
import MainLayout from '../../layouts/MainLayout';
import { PARTNERED_UNIVERSITIES, UniversityDetail } from '@alea/utils';
import { getAllCoursesFromDb } from '../api/get-all-courses';

function ColoredIconButton({ children }: { children: ReactNode }) {
  return (
    <IconButton
      sx={{
        bgcolor: PRIMARY_COL,
        '&:hover, &.Mui-focusVisible': { bgcolor: PRIMARY_COL_DARK_HOVER },
      }}
    >
      {children}
    </IconButton>
  );
}

export function CourseThumb({ course }: { course: CourseInfo }) {
  const router = useRouter();
  const { home } = getLocaleObject(router);
  const t = home.courseThumb;
  const {
    courseId,
    courseName,
    courseHome,
    imageLink,
    notesLink,
    slidesLink,
    cardsLink,
    forumLink,
    quizzesLink,
    hasQuiz,
  } = course;
  const width = courseId === 'iwgs-1' ? 83 : courseId === 'iwgs-2' ? 165 : 200;
  return (
    <Card
      sx={{
        backgroundColor: 'hsl(210, 20%, 95%)',
        border: '1px solid #CCC',
        p: '10px',
        m: '10px',
        width: '200px',
      }}
    >
      <Box display="flex" flexDirection="column" justifyContent="space-between" height="100%">
        <Box display="flex" flexDirection="column" alignItems="center">
          <Link href={courseHome} style={{ textAlign: 'center' }}>
            <Image
              src={imageLink}
              width={width}
              height={100}
              alt={courseName}
              style={{ display: 'block', margin: 'auto' }}
              priority={true}
            />
            <span style={{ fontSize: '16px', marginTop: '5px', fontWeight: 'bold' }}>
              {courseName.length > 50 ? courseId.toUpperCase() : courseName}
            </span>
          </Link>
        </Box>
        <Box display="flex" justifyContent="space-between" mt="5px" gap="5px" flexWrap="wrap">
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
            <Link href={`/study-buddy/${courseId}`} passHref>
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

  if (!courses) return null;
  return (
    <MainLayout title="Courses | ALeA">
      <Box m="0 auto" maxWidth="800px">
        <Box mx="10px">
          <br />
          <Box display="flex" alignItems="center" mb={4}>
            <Image
              src={UniversityDetail[institution]?.logo}
              alt={UniversityDetail[institution]?.fullName}
              width={UniversityDetail[institution]?.fullName === 'Other Institutions' ? 170 : 150}
              height={150}
            />
            <Typography fontFamily={'Roboto'} fontWeight={500} ml={2} color={'#04316a'}>
              {UniversityDetail[institution]?.fullName}
            </Typography>
          </Box>
          <Link href="/study-buddy">
            <Tooltip title={<Box sx={{ fontSize: 'medium' }}>{t.studyBuddyTooltip}</Box>}>
              {institution === 'FAU' ? (
                <Button variant="contained">{s.studyBuddyMasterCourse}</Button>
              ) : null}
            </Tooltip>
          </Link>

          <h2>{`${t.courseSection} (${currentTerm})`}</h2>
          <Box display="flex" flexWrap="wrap">
            {Object.values(courses)
              .filter((course) => course.isCurrent)
              .map((c) => (
                <CourseThumb key={c.courseId} course={c} />
              ))}
          </Box>
          <h2>{t.otherCourses}</h2>
          <Box display="flex" flexWrap="wrap">
            {Object.values(courses)
              .filter((course) => !course.isCurrent)
              .map((c) => (
                <CourseThumb key={c.courseId} course={c} />
              ))}
          </Box>
          <hr style={{ width: '90%' }} />
        </Box>
      </Box>
    </MainLayout>
  );
};

export default StudentHomePage;

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
              !PARTNERED_UNIVERSITIES.map((uni) => uni.code).includes(allCourses[key].institution)
          )
          .map((key) => allCourses[key])
      : await getAllCoursesFromDb(undefined, params.institution);

  return {
    props: {
      courses,
      locale,
    },
    revalidate: 3600,
  };
}
