import { Box, Button, CircularProgress, Typography, Paper, Grid, useTheme, Chip, Divider } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { CourseHeader } from '../../../components/CourseHeader';
import { CourseNotFound } from '../../../components/CourseNotFound';
import { getAllCourses, getCourseInfoMetadata } from '@alea/spec';
import { useCurrentTermContext } from '../../../contexts/CurrentTermContext';
import MainLayout from '../../../layouts/MainLayout';
import { SafeFTMLDocument } from '@alea/stex-react-renderer';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SchoolIcon from '@mui/icons-material/School';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { COURSES_INFO } from '@alea/utils';

function sortSemesters(instances: any[]) {
  return [...instances].sort((a, b) => b.semester.localeCompare(a.semester));
}

const CourseGeneralLandingPage: NextPage = () => {
  const router = useRouter();
  const theme = useTheme();
  const { currentTermByUniversityId } = useCurrentTermContext();

  const { institutionId, courseId } = router.query as { institutionId?: string; courseId?: string };

  const { data: courses, isLoading: loadingCourses } = useQuery({
    queryKey: ['courses'],
    queryFn: () => getAllCourses(),
  });

  const instIdUpper = institutionId?.toUpperCase() || '';
  const currentCourse = courses && courseId ? (courses[courseId] || courses[courseId.toLowerCase()]) : null;
  const staticCourse = courseId ? (COURSES_INFO[courseId] || COURSES_INFO[courseId.toLowerCase()]) : null;
  const staticInstances = staticCourse?.instances || [];
  const dbInstances = currentCourse?.instances || [];

  const instanceMap = new Map<string, { semester: string }>();

  const addInstance = (inst: { semester: string }) => {
    if (inst.semester === 'dummy_sem' && instanceMap.size > 0) {
      return;
    }
    instanceMap.set(inst.semester, { semester: inst.semester });
  };

  staticInstances.forEach(addInstance);
  dbInstances.forEach(addInstance);

  const mergedInstances = Array.from(instanceMap.values());
  const sortedInstances = sortSemesters(mergedInstances);

  const currentTerm = currentTermByUniversityId[instIdUpper] || 'SS26';
  const hasInstitutionLatest = sortedInstances.some((inst) => inst.semester === currentTerm);
  const latestInstanceId = hasInstitutionLatest 
    ? currentTerm 
    : sortedInstances[0]?.semester;

  const { data: latestInstanceMetadata, isLoading: loadingMetadata } = useQuery({
    queryKey: ['course-metadata', courseId, latestInstanceId],
    enabled: Boolean(courses && courseId && latestInstanceId),
    queryFn: () => getCourseInfoMetadata(courseId!, latestInstanceId!),
  });

  const isDe = router.locale === 'de';

  if (!router.isReady || loadingCourses) {
    return (
      <MainLayout title="Loading Course | ALeA">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress size={50} />
        </Box>
      </MainLayout>
    );
  }

  if (!institutionId || !courseId || !currentCourse) {
    return <CourseNotFound />;
  }

  const landingUri = latestInstanceMetadata?.landing || currentCourse.landing;
  const courseGradient = (theme.palette as any).gradients?.[courseId] || 'linear-gradient(135deg, #203360 0%, #3B517A 100%)';

  const landingCardSx = {
    p: { xs: 3, sm: 4 },
    borderRadius: 3,
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: 'divider',
  };

  const tEnterCourse = isDe ? 'Kursbereich betreten' : 'Enter Course Workspace';
  const tEnterCourseDesc = isDe 
    ? 'Greifen Sie auf alle Vorlesungsnotizen, Folien, Quizzes und Foren des aktuellen Semesters zu.'
    : 'Access all lecture notes, slides, quizzes, study buddies, and forums for the current semester.';
  const tAvailableInstances = isDe ? 'Verfügbare Semester' : 'Available Semesters';
  const tLatest = isDe ? 'Neuestes' : 'Latest';

  const handleEnterLatest = () => {
    router.push(`/${institutionId}/${courseId}/${latestInstanceId}`);
  };

  return (
    <MainLayout title={`${currentCourse.courseName} | ALeA`}>
      <CourseHeader
        courseName={currentCourse.courseName}
        imageLink={currentCourse.imageLink}
        courseId={courseId}
        institutionId={instIdUpper}
        instanceId={latestInstanceId}
      />

      <Box
        sx={{
          maxWidth: 900,
          margin: 'auto',
          px: { xs: 2, sm: 3 },
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          pb: 8
        }}
      >
        {/* Hero Banner with Call-To-Action (CTA) */}
        <Paper
          elevation={4}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            background: theme.palette.mode === 'dark' 
              ? 'linear-gradient(135deg, rgba(32,51,96,0.15) 0%, rgba(15,23,42,0.8) 100%)' 
              : 'linear-gradient(135deg, rgba(32,51,96,0.05) 0%, rgba(245,247,251,0.9) 100%)',
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
              : '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
          }}
        >
          {/* Subtle colored accent block representing the course gradient */}
          <Box 
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '6px',
              height: '100%',
              background: courseGradient,
            }}
          />

          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box display="flex" alignItems="center" gap={1.5} mb={1} flexWrap="wrap">
                <SchoolIcon color="primary" sx={{ fontSize: 28 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {tEnterCourse}
                </Typography>
                <Chip 
                  label={latestInstanceId} 
                  size="small" 
                  color="primary"
                  sx={{ 
                    fontWeight: 'bold', 
                    background: courseGradient, 
                    color: '#fff',
                    borderRadius: 1.5
                  }} 
                />
              </Box>
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: { xs: 2, md: 0 } }}>
                {tEnterCourseDesc}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Button
                onClick={handleEnterLatest}
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  py: 1.5,
                  px: 3,
                  fontWeight: 'bold',
                  fontSize: 16,
                  borderRadius: 2.5,
                  background: courseGradient,
                  color: '#fff',
                  boxShadow: '0px 4px 15px rgba(32, 51, 96, 0.25)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0px 8px 20px rgba(32, 51, 96, 0.35)',
                    opacity: 0.95
                  }
                }}
              >
                {isDe ? 'Kurs beitreten' : 'Enter Workspace'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* List of Available Instances */}
        {sortedInstances.length > 0 && (
          <Box>
            <Box display="flex" alignItems="center" gap={1.5} mb={2}>
              <CalendarMonthIcon color="action" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {tAvailableInstances}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {sortedInstances.map((instance) => {
                const isLatest = instance.semester === latestInstanceId;
                const path = `/${institutionId}/${courseId}/${instance.semester}`;

                return (
                  <Button
                    key={instance.semester}
                    variant={isLatest ? 'contained' : 'outlined'}
                    onClick={() => router.push(path)}
                    sx={{
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
                      ...(isLatest && {
                        background: courseGradient,
                        color: '#fff',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                      }),
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'scale(1.03)',
                        ...(isLatest && {
                          opacity: 0.95
                        })
                      }
                    }}
                  >
                    {isLatest && <CheckCircleIcon fontSize="small" style={{ color: '#fff' }} />}
                    {instance.semester}
                    {isLatest && ` (${tLatest})`}
                  </Button>
                );
              })}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 1 }} />

        {/* Landing Page Content Render */}
        {loadingMetadata ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress size={30} />
          </Box>
        ) : landingUri ? (
          <Paper
            elevation={1}
            sx={landingCardSx}
          >
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 3, color: 'primary.main', borderBottom: '2px solid', borderColor: 'divider', pb: 1.5 }}>
              {isDe ? 'Einführung & Kursinformationen' : 'Welcome & Course Information'}
            </Typography>

            <Box fragment-uri={landingUri} fragment-kind="Section">
              <SafeFTMLDocument
                document={{ type: 'FromBackend', uri: landingUri }}
                showContent={false}
                pdfLink={false}
                chooseHighlightStyle={false}
                toc="None"
              />
            </Box>
          </Paper>
        ) : (
          currentCourse.teaser && (
            <Paper
              elevation={1}
              sx={landingCardSx}
            >
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, color: 'primary.main' }}>
                {isDe ? 'Über diesen Kurs' : 'About this Course'}
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

export default CourseGeneralLandingPage;
