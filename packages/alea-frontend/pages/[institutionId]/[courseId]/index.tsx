import { Box, Button, Divider, Paper, Typography, useTheme, SxProps, Theme } from '@mui/material';
import type { GetStaticPaths, GetStaticProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MainLayout from '../../../layouts/MainLayout';
import { SafeFTMLDocument } from '@alea/stex-react-renderer';
import { getLocaleObject } from '../../../lang/utils';
import { CourseInfo, CURRENT_TERM, UNIVERSITY_TERMS } from '@alea/utils';
import { getAllCoursesFromDb } from '../../api/get-all-courses';
import { getCourseInfoMetadataFromDb } from '../../api/course-metadata/get-course-info-metadata';

const getCoursesOnce = (() => {
  let cache: Record<string, CourseInfo> = null;
  return async () => {
    if (!cache) {
      cache = await getAllCoursesFromDb();
    }
    return cache;
  };
})();
interface CourseInstance {
  semester: string;
}
interface Course {
  courseName: string;
  teaser?: string;
  landing?: string;
  institution?: string;
  instances?: CourseInstance[];
}
interface CourseLandingPageProps {
  institutionId: string;
  courseId: string;
  currentCourse: Course;
  latestInstanceId: string;
  latestInstanceMetadata: any;
  sortedInstances: CourseInstance[];
}

const sortSemesters = (instances: CourseInstance[]) =>
  [...instances].sort((a, b) => b.semester.localeCompare(a.semester));

const CourseLandingPage: NextPage<CourseLandingPageProps> = ({
  institutionId,
  courseId,
  currentCourse,
  latestInstanceId,
  latestInstanceMetadata,
  sortedInstances,
}) => {
  const router = useRouter();
  const theme = useTheme();

  const { courseLanding: t } = getLocaleObject(router);
  const landingUri = latestInstanceMetadata?.landing || currentCourse.landing;
  const courseGradient =
    (theme.palette as any).gradients?.[courseId] ||
    'linear-gradient(135deg, #203360 0%, #3B517A 100%)';
  return (
    <MainLayout title={`${currentCourse.courseName} | ALeA`}>
      <Box sx={courseLandingStyles.contentWrapper}>
        {sortedInstances.length > 0 && (
          <Box>
            <Box display="flex" alignItems="center" gap={1.5} mb={2}>
              <CalendarMonthIcon color="action" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {t.courseInstances}
              </Typography>
            </Box>

            <Box display="flex" gap={2} flexWrap="wrap">
              {sortedInstances.map((instance) => {
                const isLatest = instance.semester === latestInstanceId;
                const path = `/${institutionId}/${courseId}/${instance.semester}`;

                return (
                  <Button
                    key={instance.semester}
                    variant={isLatest ? 'contained' : 'outlined'}
                    onClick={() => router.push(path)}
                    sx={{
                      ...courseLandingStyles.instanceButton,
                      ...(isLatest && {
                        background: courseGradient,
                        color: '#fff',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                      }),
                      '&:hover': {
                        transform: 'scale(1.03)',
                        ...(isLatest && { opacity: 0.95 }),
                      },
                    }}
                  >
                    {isLatest && <CheckCircleIcon fontSize="small" sx={{ color: '#fff' }} />}
                    {instance.semester}
                    {isLatest && ` (${t.latest})`}
                  </Button>
                );
              })}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 1 }} />
        {landingUri ? (
          <Box width="100%">
            <Typography variant="h5" sx={courseLandingStyles.courseInfoTitle}>
              {t.CourseInfo}
            </Typography>

            <Box fragment-uri={landingUri} fragment-kind="Section" sx={courseLandingStyles.ftmlBox}>
              <SafeFTMLDocument
                document={{ type: 'FromBackend', uri: landingUri }}
                showContent={false}
                pdfLink={false}
                chooseHighlightStyle={false}
                toc="None"
              />
            </Box>
          </Box>
        ) : (
          currentCourse.teaser && (
            <Paper elevation={1} sx={courseLandingStyles.landingCard}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, color: 'text.primary' }}>
                {t.aboutThisCourse}
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
                {currentCourse.teaser}
              </Typography>
            </Paper>
          )
        )}
      </Box>
    </MainLayout>
  );
};
export const getStaticProps: GetStaticProps<CourseLandingPageProps> = async ({ params }) => {
  const institutionId = String(params?.institutionId ?? '');
  console.log({ params });
  const courseId = String(params?.courseId ?? '');

  try {
    const courses = await getCoursesOnce();

    const compositeKey = `${institutionId}||${courseId}`.toLowerCase();
    const currentCourse = courses[compositeKey] ?? null;
    if (!currentCourse) {
      return { notFound: true };
    }
    const currentTerm = UNIVERSITY_TERMS[institutionId.toUpperCase()]?.currentTerm || CURRENT_TERM;

    const sortedInstances = sortSemesters(currentCourse.instances ?? []);

    const latestInstanceId =
      sortedInstances.find((i) => i.semester === currentTerm)?.semester ||
      sortedInstances[0]?.semester ||
      '';

    const latestInstanceMetadata = latestInstanceId
      ? await getCourseInfoMetadataFromDb(courseId, latestInstanceId)
      : null;

    return {
      props: {
        institutionId,
        courseId,
        currentCourse,
        latestInstanceId,
        latestInstanceMetadata,
        sortedInstances,
      },
      revalidate: 60,
    };
  } catch (error) {
    console.error('Error during SSG fetch:', error);
    return { notFound: true };
  }
};
export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const allCourses = await getCoursesOnce();
    const paths = Object.values(allCourses).map((course) => ({
      params: { institutionId: course.universityId || 'FAU', courseId: course.courseId },
    }));
    return { paths, fallback: 'blocking' };
  } catch (error) {
    console.error('Error generating static paths:', error);
    return { paths: [], fallback: 'blocking' };
  }
};
const courseLandingStyles: Record<
  'contentWrapper' | 'instanceButton' | 'courseInfoTitle' | 'ftmlBox' | 'landingCard',
  SxProps<Theme>
> = {
  contentWrapper: {
    maxWidth: 900,
    margin: 'auto',
    px: { xs: 2, sm: 3 },
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    pb: 8,
  },
  instanceButton: {
    py: 1,
    px: 2.5,
    borderRadius: 2,
    fontWeight: 600,
    textTransform: 'none',
    fontSize: 14,
    borderColor: 'divider',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 1,
    transition: 'all 0.2s',
  },
  courseInfoTitle: {
    fontWeight: 800,
    mb: 3,
    color: 'text.primary',
    pb: 1.5,
    textAlign: 'center',
  },
  ftmlBox: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    '& .ftml-reset': {
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      backgroundColor: '#ffffff',
      color: '#000000',
      borderRadius: 3,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },
  },
  landingCard: {
    p: { xs: 3, sm: 4 },
    borderRadius: 3,
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: 'divider',
  },
};

export default CourseLandingPage;
