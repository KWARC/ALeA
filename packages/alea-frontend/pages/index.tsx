import FeedIcon from '@mui/icons-material/Feed';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { Box, Button, IconButton, Tooltip, Typography, useMediaQuery } from '@mui/material';
import {
  getCourseInfo,
  getResourcesForUser,
  isLoggedIn,
  updateUserInfoFromToken,
} from '@alea/spec';
import { ServerLinksContext } from '@alea/stex-react-renderer';
import { Action, CourseInfo, CourseResourceAction, PRIMARY_COL } from '@alea/utils';
import { NextPage } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useContext, useEffect, useState } from 'react';
import { useCurrentTermContext } from '../contexts/CurrentTermContext';
import WelcomeScreen from '../components/WelcomeScreen';
import { getLocaleObject } from '../lang/utils';
import MainLayout from '../layouts/MainLayout';
import { PARTNERED_UNIVERSITIES } from '@alea/utils';

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
  const loggedIn = isLoggedIn();

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
          maxWidth: '1200px',
          display: 'flex',
          alignItems: 'center',
          padding: tight ? '20px' : '50px 20px 100px',
          justifyContent: 'space-around',
        }}
      >
        <Box>
          <Typography
            variant="h2"
            sx={{
              paddingBottom: 2,
              color: PRIMARY_COL,
              fontFamily: 'sans-serif,roboto',
            }}
          >
            {n.alea}
          </Typography>
          <Typography
            variant="body1"
            maxWidth="600px"
            mb="16px"
            fontFamily={'sans-serif,roboto'}
            display="flex"
          >
            {n.aleaDesc}
          </Typography>

          {!loggedIn && (
            <Button
              variant="contained"
              color="primary"
              sx={{ margin: '5px 5px 5px 0px' }}
              onClick={() => router.push('/signup')}
            >
              {n.signUpNow}
            </Button>
          )}
          <Button
            sx={{ margin: '5px 5px 5px 0px' }}
            variant="outlined"
            onClick={() => {
              router.push('/course-list');
            }}
          >
            {n.exploreOurCourse}
          </Button>
          <Button
            sx={{ margin: '5px 5px 5px 0px', gap: '5px' }}
            variant="contained"
            onClick={() => {
              router.push('/blog');
            }}
          >
            <FeedIcon />
            blog
          </Button>
          <Button
            sx={{ margin: '5px 5px 5px 0px', gap: '5px' }}
            variant="outlined"
            onClick={() => {
              router.push('https://kwarc.github.io/bibs/voll-ki/');
            }}
          >
            <LibraryBooksIcon />
            {n.publications}
          </Button>
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
        bgcolor,
        padding: '20px',
        mb: '-10px',
      }}
    >
      <Typography
        style={{
          textAlign: 'center',
          marginTop: '20px',
          fontWeight: '400',
          fontSize: '20px',
        }}
      >
        {n.vollKiProjectInfo}
      </Typography>
      <img
        src="/fau_kwarc.png"
        alt="Explore courses"
        style={{ padding: '20px', maxWidth: '100%' }}
      />
    </Box>
  );
}

export function CourseCard({ course, currentTerm }) {
  const { imageLink: courseImage, courseName, courseId, institution, instructors } = course;
  const instructor = getInstructor(course, currentTerm) ?? instructors[0];
  return (
    <Link href={`/course-home/${courseId}`}>
      <Box
        sx={{
          cursor: 'pointer',
          boxShadow: '0 4px 8px 0 rgba(0, 0, 0, 0.2)',
          width: '220px',
          margin: '15px',
          textAlign: 'center',
          height: '260px',
          backgroundColor: 'rgb(237, 237, 237)',
          borderRadius: '2rem',
          padding: '1rem',
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
          style={{ borderRadius: '10px' }}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
          <Typography
            sx={{
              fontSize: '18px',
              fontWeight: 'bold',
              padding: '10px',
              color: '#003786',
            }}
          >
            {courseName.length > 45 ? courseId.toUpperCase() : courseName}
          </Typography>
          <Typography sx={{ fontSize: '14px', padding: '5px' }}>{institution}</Typography>
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
        width: '200px',
        flexDirection: 'column',
        margin: '50px 20px',
      }}
    >
      <Image src={img_url} height={80} width={80} alt="University_Credits" />
      <Typography
        sx={{
          fontSize: '18px',
          fontWeight: 'bold',
          marginTop: '15px',
          wordWrap: 'break-word',
          textAlign: 'center',
        }}
      >
        {title}
      </Typography>
      <Typography sx={{ fontSize: '12px', color: '#696969', textAlign: 'center' }}>
        {description}
      </Typography>
    </Box>
  );
}

const StudentHomePage: NextPage = ({ filteredCourses }: { filteredCourses: CourseInfo[] }) => {
  const loggedIn = isLoggedIn();
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
        <Box sx={{ backgroundColor: '#F5F5F5', padding: '80px' }}>
          <Box sx={{ margin: '0 auto', maxWidth: '1200px' }}>
            <Typography
              style={{
                color: '#757575',
                fontWeight: '400',
                fontSize: '20px',
                textAlign: 'center',
              }}
            >
              <b>{n.partneredWith.split('+')[0]}</b> {n.partneredWith.split('+')[1]}
              <span style={{ color: PRIMARY_COL }}>
                <b> {n.partneredWith.split('+')[2]}</b>
              </span>
              .
            </Typography>
            <br />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'space-around',
                gap: '20px',
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
                  <Typography sx={{ fontWeight: '500' }}>
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
            minHeight: '300px',
            padding: '20px',
            marginTop: '40px',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '0 auto',
            maxWidth: '1200px',
          }}
        >
          <Typography
            sx={{
              textAlign: 'center',
              fontWeight: 'bold',
              color: PRIMARY_COL,
              fontSize: '24px',
              marginTop: '30px',
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
            minHeight: '300px',
            padding: '20px',
            marginTop: '40px',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '0 auto',
            maxWidth: '1200px',
          }}
        >
          <Typography
            sx={{
              fontWeight: 'bold',
              color: PRIMARY_COL,
              fontSize: '24px',
              marginTop: '30px',
            }}
          >
            {n.exploreCourses}
          </Typography>
          <Box
            id="courses"
            sx={{
              display: 'flex',
              justifyContent: 'space-around',
              marginTop: '40px',
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
  const courses = await getCourseInfo();
  const filteredKeys = Object.keys(courses).filter((key) =>
    FEATURED_COURSES.includes(courses[key].courseId)
  );
  const filteredCourses = filteredKeys.map((key) => courses[key]);
  return {
    props: { filteredCourses },
    revalidate: 3600,
  };
}
