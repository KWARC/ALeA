import { Box, Button, CircularProgress, Typography, Paper, useTheme, Divider } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { CourseHeader } from '../../../components/CourseHeader';
import { CourseNotFound } from '../../../components/CourseNotFound';
import { getAllCourses, getCourseInfoMetadata } from '@alea/spec';
import { useCurrentTermContext } from '../../../contexts/CurrentTermContext';
import MainLayout from '../../../layouts/MainLayout';
import { SafeFTMLDocument } from '@alea/stex-react-renderer';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getLocaleObject } from '../../../lang/utils';

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
  const currentCourse =
    courses && courseId ? courses[courseId] || courses[courseId.toLowerCase()] : null;
  const dbInstances = currentCourse?.instances || [];
  const sortedInstances = sortSemesters(dbInstances);

  const currentTerm = currentTermByUniversityId[instIdUpper] || 'SS26';
  const hasInstitutionLatest = sortedInstances.some((inst) => inst.semester === currentTerm);
  const latestInstanceId = hasInstitutionLatest ? currentTerm : sortedInstances[0]?.semester;

  const { data: latestInstanceMetadata, isLoading: loadingMetadata } = useQuery({
    queryKey: ['course-metadata', courseId, latestInstanceId],
    enabled: Boolean(courses && courseId && latestInstanceId),
    queryFn: () => getCourseInfoMetadata(courseId!, latestInstanceId!),
  });

  const { courseLanding: t } = getLocaleObject(router);

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
  const courseGradient =
    (theme.palette as any).gradients?.[courseId] ||
    'linear-gradient(135deg, #203360 0%, #3B517A 100%)';

  const landingCardSx = {
    p: { xs: 3, sm: 4 },
    borderRadius: 3,
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: 'divider',
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
          pb: 8,
        }}
      >
        {sortedInstances.length > 0 && (
          <Box>
            <Box display="flex" alignItems="center" gap={1.5} mb={2}>
              <CalendarMonthIcon color="action" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {t.courseInstances}
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
                          opacity: 0.95,
                        }),
                      },
                    }}
                  >
                    {isLatest && <CheckCircleIcon fontSize="small" style={{ color: '#fff' }} />}
                    {instance.semester}
                    {isLatest && ` (${t.latest})`}
                  </Button>
                );
              })}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 1 }} />
        {loadingMetadata ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress size={30} />
          </Box>
        ) : landingUri ? (
                   <Box sx={{ width: '100%' }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                mb: 3,
                color: 'text.primary',
                pb: 1.5,
                textAlign: 'center',
              }}
            >
              {t.CourseInfo}
            </Typography>

            <Box
              fragment-uri={landingUri}
              fragment-kind="Section"
              sx={{
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
              }}
            >
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
            <Paper elevation={1} sx={landingCardSx}>
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

export default CourseGeneralLandingPage;
