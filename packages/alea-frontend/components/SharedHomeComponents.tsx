import FeedIcon from '@mui/icons-material/Feed';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import {
  Box,
  Button,
  Card,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useIsLoggedIn } from '@alea/react-utils';
import { CourseInfo } from '@alea/utils';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getLocaleObject } from '../lang/utils';

export function getInstructor(courseData: CourseInfo, currentSemester: string) {
  for (const instance of courseData.instances) {
    if (instance.semester === currentSemester) {
      if (instance.instructors && instance.instructors.length > 0) {
        return instance.instructors[0];
      }
    }
  }
}

export const BannerSection = ({ tight = false }: { tight?: boolean }) => {
  const theme = useTheme();
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
              color: 'text.primary',
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
            variant="contained"
            color="primary"
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
            sx={{
              margin: '5px 5px 5px 0px',
              gap: '5px',
            }}
            variant="contained"
            color="primary"
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

export function VollKiInfoSection({ bgcolor }: { bgcolor?: string }) {
  const theme = useTheme();
  const background = bgcolor || theme.palette.section.secondary;
  const {
    home: { newHome: n },
  } = getLocaleObject(useRouter());

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: background,
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
      <Image
        src="/fau_kwarc.png"
        alt="Explore courses"
        width={500}
        height={300}
        style={{ padding: '20px', maxWidth: '100%', height: 'auto' }}
      />
    </Box>
  );
}

export function CourseCard({ course, currentTerm }) {
  const { imageLink: courseImage, courseName, courseId, universityId, instructors } = course;
  const instructor = getInstructor(course, currentTerm) ?? instructors[0];
  const theme = useTheme();
  return (
    <Link href={`/course-home/${courseId}`}>
      <Card
        sx={{
          cursor: 'pointer',
          width: '260px',
          margin: '20px',
          textAlign: 'center',
          height: '300px',
          backgroundColor: 'card.background',
          border: '1px solid',
          borderColor: 'card.border',
          borderRadius: '2rem',
          padding: '2rem',
          transition: 'transform 0.3s',
          '&:hover': {
            transform: 'scale(1.1)',
          },
        }}
      >
        <Image
          height={140}
          width={courseId === 'iwgs-1' ? 120 : 220}
          src={courseImage}
          alt="course-image"
          style={{ borderRadius: '10px' }}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', marginTop: '15px' }}>
          <Typography
            sx={{
              fontSize: '20px',
              fontWeight: 'bold',
              padding: '10px',
              color: 'text.primary',
            }}
          >
            {courseName.length > 45 ? courseId.toUpperCase() : courseName}
          </Typography>
          <Typography sx={{ fontSize: '14px', padding: '5px' }}>{universityId}</Typography>
          <Typography
            sx={{
              fontSize: '14px',
              padding: '5px',
              color: theme.palette.mode === 'dark' ? 'white' : 'text.primary',
            }}
          >
            {instructor}
          </Typography>
        </Box>
      </Card>
    </Link>
  );
}

export function AleaFeatures({ img_url, title, description }) {
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
      <Typography sx={{ fontSize: '12px', color: 'text.secondary', textAlign: 'center' }}>
        {description}
      </Typography>
    </Box>
  );
}
