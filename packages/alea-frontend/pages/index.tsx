import FeedIcon from '@mui/icons-material/Feed';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { Box, Button, IconButton, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { getResourcesForUser, updateUserInfoFromToken } from '@alea/spec';
import { Action, CourseInfo, CourseResourceAction, PRIMARY_COL } from '@alea/utils';
import { NextPage } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useCurrentTermContext } from '../contexts/CurrentTermContext';
import WelcomeScreen from '../components/WelcomeScreen';
import { getLocaleObject } from '../lang/utils';
import MainLayout from '../layouts/MainLayout';
import { PARTNERED_UNIVERSITIES } from '@alea/utils';
import { getAllCoursesFromDb } from './api/get-all-courses';
import { useIsLoggedIn } from '@alea/react-utils';
import shadows from '../theme/shadows';

function getInstructor(courseData: CourseInfo, currentSemester: string) {
  for (const instance of courseData.instances) {
    if (instance.semester === currentSemester) {
      if (instance.instructors && instance.instructors.length > 0) {
        return instance.instructors[0];
      }
    }
  }
}

const aleaFeatures = [
  {
    img_url: '/selfpaced.png',
    title: 'Self paced learning',
    title_de: 'Selbstverwaltungsfaehig',
    description:
      'Empowering students to learn at their own speed, fostering independence and personalized progress.',
    description_de:
      'Studierende in ihren eigenenen Tempi lernen lassen, Selbstverwaltung und persönlichen Fortschritt fördern.',
  },
  {
    img_url: '/University_Credits.png',
    title: 'Adaptive learning',
    title_de: 'Anpassungsfaehig',
    description:
      'Tailoring content and difficulty based on individual student performance, maximizing engagement and comprehension.',
    description_de:
      'Inhalte und Schwierigkeit anpassen, basierend auf der individuellen Leistung der Studierenden, um Engagement und Verständnis zu maximieren.',
  },
  {
    img_url: '/up.png',
    title: 'See student progress',
    title_de: 'Schuelerfortschritt sehen',
    description:
      'Providing real-time insights into student advancement, facilitating targeted support and encouragement.',
    description_de:
      'Fortschritt Studierender sehen, real-time Informationen über den Fortschritt der Studierenden ermöglichen, Zielorientierte Unterstützung ermöglichen.',
  },
  {
    img_url: '/quiz.png',
    title: 'Live Quizzes',
    title_de: 'Live-Quizzes',
    description:
      'Offering interactive assessments in real-time, promoting active participation and immediate feedback for enhanced learning outcomes.',
    description_de:
      'Bietet interaktive Tests in Echtzeit, um aktive Teilnahme und sofortiges Feedback zu fördern, und die Lernergebnisse zu verbessern.',
  },
];

const FEATURED_COURSES = ['ai-1', 'ai-2', 'gdp', 'iwgs-2', 'krmt', 'smai'];

export const BannerSection = ({ tight = false }: { tight?: boolean }) => {
  const router = useRouter();
  const {
    home: t,
    home: { newHome: n },
  } = getLocaleObject(router);
  const isSmallScreen = useMediaQuery('(max-width:800px)');
  const { loggedIn } = useIsLoggedIn();

  return (
    <>
      <Tooltip
        sx={{ float: 'right' }}
        title={
          <Box sx={{ fontSize: 'medium' }}>
            <span style={{ display: 'block' }}>{t.expIconHover1}</span>
            <span>{t.expIconHover2}</span>
          </Box>
        }
      >
        <IconButton
          sx={{ float: 'right', zIndex: 2 }}
          size="large"
          onClick={() => router.push('/exp')}
        >
          <Image height={30} width={30} src="/experiment.svg" alt="Experiments" />
        </IconButton>
      </Tooltip>
      <Box
        sx={{
          margin: '0 auto',
          maxWidth: 1200,
          display: 'flex',
          alignItems: 'center',
          padding: tight ? '20px' : '50px 20px 100px',
          justifyContent: 'space-around',
        }}
      >
        <Box>
          <Typography
            variant="T1"
            sx={{
              paddingBottom: 2,
              letterSpacing: -0.5,
              color: 'text.primary',
            }}
          >
            {n.alea}
          </Typography>
          <Typography variant="body1" maxWidth={600} mb={2} display="flex">
            {n.aleaDesc}
          </Typography>
          <Box display="flex" gap={0.75} flexWrap="wrap">
            {!loggedIn && (
              <Button variant="contained" color="primary" onClick={() => router.push('/signup')}>
                {n.signUpNow}
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={() => {
                router.push('/course-list');
              }}
            >
              {n.exploreOurCourse}
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                router.push('/blog');
              }}
            >
              <FeedIcon />
              blog
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                router.push('https://kwarc.github.io/bibs/voll-ki/');
              }}
            >
              <LibraryBooksIcon />
              {n.publications}
            </Button>
          </Box>
        </Box>
        {!isSmallScreen && !tight && (
          <Image
            style={{ borderRadius: '50%' }}
            src={'/student.jpg'}
            width={350}
            height={350}
            alt="profile"
          />
        )}
      </Box>
    </>
  );
};

export function VollKiInfoSection({ bgcolor = '#F5F5F5' }: { bgcolor?: string }) {
  const {
    home: { newHome: n },
  } = getLocaleObject(useRouter());

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: 'background.paper',
        padding: 2.5,
        mb: -1.25,
      }}
    >
      <Typography
        sx={{
          textAlign: 'center',
          marginTop: 2.5,
          fontWeight: 400,
          fontSize: 20,
          maxWidth: 'lg',
          textWrap: 'wrap',
        }}
      >
        {n.vollKiProjectInfo}
      </Typography>
      <Image
        src="/fau_kwarc.png"
        alt="Explore courses"
        width={400}
        height={400}
        style={{ width: '100%', height: 'auto', paddingTop: '20px', paddingBottom: '20px' }}
      />
    </Box>
  );
}

export function CourseCard({ course, currentTerm }) {
  const { imageLink: courseImage, courseName, courseId, universityId, instructors } = course;
  const instructor = getInstructor(course, currentTerm) ?? instructors[0];
  return (
    <Link href={`/course-home/${courseId}`}>
      <Box
        sx={{
          cursor: 'pointer',
          boxShadow: shadows[5],
          width: 252, //width and height fixed intentionally to maintain uniformity on landing page
          height: 292,
          borderRadius: 8,
          m: 2,
          p: 2,
          textAlign: 'center',
          backgroundColor: 'background.card',
          overflowY: 'scroll',
          transition: 'transform 0.3s',
          '&:hover': {
            transform: 'scale(1.1)',
          },
        }}
      >
        <Image
          height={120}
          width={courseId === 'iwgs-1' ? 100 : 200}
          src={courseImage}
          alt="course-image"
          style={{ borderRadius: 2.5 }}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
          <Typography
            sx={{
              fontSize: '18px',
              fontWeight: 'bold',
              padding: '10px',
              color: 'text.primary',
            }}
          >
            {courseName.length > 45 ? courseId.toUpperCase() : courseName}
          </Typography>
          <Typography sx={{ fontSize: '14px', padding: '5px' }}>{universityId}</Typography>
          <Typography sx={{ fontSize: '14px', padding: '5px' }}>{instructor}</Typography>
        </Box>
      </Box>
    </Link>
  );
}

function AleaFeatures({ img_url, title, description }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        width: 200,
        flexDirection: 'column',
        my: 6.25,
        mx: 2.5,
      }}
    >
      <Image src={img_url} height={80} width={80} alt="University_Credits" />
      <Typography
        sx={{
          fontSize: 18,
          fontWeight: 'bold',
          marginTop: 2,
          wordWrap: 'break-word',
          textAlign: 'center',
        }}
      >
        {title}
      </Typography>
      <Typography sx={{ fontSize: 12, color: 'grey.700', textAlign: 'center' }}>
        {description}
      </Typography>
    </Box>
  );
}

const StudentHomePage: NextPage = ({ filteredCourses }: { filteredCourses: CourseInfo[] }) => {
  const { loggedIn } = useIsLoggedIn();
  const router = useRouter();
  const { currentTermByUniversityId } = useCurrentTermContext();
  const currentTerm = currentTermByUniversityId['FAU'];

  const [resourcesForInstructor, setResourcesForInstructor] = useState<CourseResourceAction[]>([]);
  useEffect(() => {
    updateUserInfoFromToken();
  }, []);

  const {
    home: { newHome: n },
  } = getLocaleObject(router);

  useEffect(() => {
    async function resourcesAccessToUser() {
      const resources = await getResourcesForUser();
      const resourceAccessToInstructor = resources
        .map((item) => ({
          ...item,
          actions: item.actions.filter((action) => action !== Action.TAKE),
        }))
        .filter((resource) => resource.actions.length > 0);
      setResourcesForInstructor(resourceAccessToInstructor);
    }
    resourcesAccessToUser();
  }, []);

  if (loggedIn) {
    return (
      <WelcomeScreen
        resourcesForInstructor={resourcesForInstructor}
        filteredCourses={filteredCourses}
      />
    );
  }
  return (
    <MainLayout title="Courses | ALeA">
      <Box m="0 auto">
        <BannerSection />
        <Box sx={{ backgroundColor: 'background.paper', padding: 10 }}>
          <Box sx={{ margin: '0 auto', maxWidth: 1200 }}>
            <Typography
              sx={{
                color: 'secondary.700',
                fontSize: 20,
                textAlign: 'center',
              }}
            >
              <b>{n.partneredWith.split('+')[0]}</b> {n.partneredWith.split('+')[1]}
              <Typography component="span" sx={{ color: 'text.primary', fontSize: 20 }}>
                <b> {n.partneredWith.split('+')[2]}</b>
              </Typography>
              .
            </Typography>
            <br />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'space-around',
                gap: 2.5,
              }}
            >
              {PARTNERED_UNIVERSITIES.map((university, index) => (
                <Box
                  key={index}
                  sx={{
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    transition: 'transform 0.3s',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                  }}
                  onClick={() => router.push(`/u/${university.code}`)}
                >
                  <Image
                    src={university.logoSrc}
                    alt={university.name + ' - logo'}
                    width={university.code === 'others' ? 160 : 140}
                    height={140}
                  />
                  <Typography sx={{ fontWeight: 500 }}>
                    {router.locale === 'de'
                      ? university.name_de ?? university.name
                      : university.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 300,
            padding: 2.5,
            marginTop: 5,
            justifyContent: 'center',
            alignItems: 'center',
            margin: '0 auto',
            maxWidth: 1200,
          }}
        >
          <Typography
            sx={{
              textAlign: 'center',
              fontWeight: 'bold',
              color: 'text.primary',
              fontSize: 24,
              marginTop: 3,
            }}
          >
            {n.whyAlea}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {aleaFeatures.map((feature, index) => (
              <AleaFeatures
                key={index}
                img_url={feature.img_url}
                title={router.locale === 'en' ? feature.title : feature.title_de}
                description={router.locale === 'en' ? feature.description : feature.description_de}
              />
            ))}
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 300,
            padding: 5,
            marginTop: 5,
            justifyContent: 'center',
            alignItems: 'center',
            margin: '0 auto',
            maxWidth: 1200,
          }}
        >
          <Typography
            sx={{
              fontWeight: 'bold',
              color: 'text.primary',
              fontSize: 24,
              marginTop: 3.5,
            }}
          >
            {n.exploreCourses}
          </Typography>
          <Box
            id="courses"
            sx={{
              display: 'flex',
              justifyContent: 'space-around',
              marginTop: 5,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {filteredCourses.map((course) => (
              <CourseCard key={course.courseId} course={course} currentTerm={currentTerm} />
            ))}
          </Box>
        </Box>

        <VollKiInfoSection />
      </Box>
    </MainLayout>
  );
};

export default StudentHomePage;

export async function getStaticProps() {
  const courses = await getAllCoursesFromDb();
  const filteredKeys = Object.keys(courses).filter((key) =>
    FEATURED_COURSES.includes(courses[key].courseId)
  );
  const filteredCourses = filteredKeys.map((key) => courses[key]);
  return {
    props: { filteredCourses },
    revalidate: 3600,
  };
}
