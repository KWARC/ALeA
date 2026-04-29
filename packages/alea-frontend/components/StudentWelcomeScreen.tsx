import { getCourseIdsForEnrolledUser } from '@alea/spec';
import { useCurrentUser } from '@alea/react-utils';
import type { CourseInfo } from '@alea/utils';
import { Box, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentTermContext } from '../contexts/CurrentTermContext';
import { useAllCourses } from '../hooks/useAllCourses';
import { getLocaleObject } from '../lang/utils';
import MainLayout from '../layouts/MainLayout';
import { BannerSection, VollKiInfoSection } from '../pages';
import {
  CourseDashboardCard,
  DEFAULT_INSTITUTION,
  EmptyEnrollmentState,
  ExploreCoursesSection,
  getAggregatedQuickAccess,
  hasAnyQuickAccess,
  useStudentDashboardData,
  WhatsNextSection,
} from './StudentDashboard';
import SystemAlertBanner from './SystemAlertBanner';

export default function StudentWelcomeScreen({
  filteredCourses = [],
}: {
  filteredCourses?: CourseInfo[];
}) {
  const router = useRouter();
  const { currentTermByUniversityId } = useCurrentTermContext();
  const currentTerm = currentTermByUniversityId[DEFAULT_INSTITUTION];

  const locale = getLocaleObject(router);
  const t = locale.studentWelcomeScreen;
  const welcomeText = (locale.resource as { welcome?: string }).welcome ?? 'Welcome';
  const localeHome = locale.home.newHome;

  const { user: userInfo } = useCurrentUser();
  const { data: allCourses = {} } = useAllCourses(DEFAULT_INSTITUTION);
  const { data: enrolledCourseIds = [] } = useQuery({
    queryKey: ['enrolled-course-ids', currentTerm],
    queryFn: () => getCourseIdsForEnrolledUser(currentTerm).then((r) => r.enrolledCourseIds ?? []),
    enabled: !!currentTerm,
  });

  const enrolledCourses = useMemo(
    () => enrolledCourseIds.filter((id) => allCourses[id]).map((id) => allCourses[id]),
    [enrolledCourseIds, allCourses]
  );

  const { data: courseData, loading } = useStudentDashboardData(
    enrolledCourseIds,
    currentTerm,
    allCourses,
    DEFAULT_INSTITUTION
  );
  const quickAccess = useMemo(
    () => getAggregatedQuickAccess(courseData, allCourses),
    [courseData, allCourses]
  );
  const showWhatsNext = !loading && hasAnyQuickAccess(quickAccess) && enrolledCourses.length > 0;

  return (
    <MainLayout title="My Dashboard | ALeA">
      <SystemAlertBanner />
      <BannerSection tight />

      <Box
        sx={{
          maxWidth: 1400,
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 4, md: 6 },
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h3"
            fontWeight={700}
            color="text.primary"
            sx={{ letterSpacing: '-0.03em', mb: 1 }}
          >
            {welcomeText}, {userInfo?.fullName ?? 'there'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
            {t.subtitle}
          </Typography>
        </Box>

        {showWhatsNext && <WhatsNextSection quickAccess={quickAccess} />}

        {enrolledCourses.length === 0 ? (
          <EmptyEnrollmentState exploreCoursesLabel={localeHome.exploreOurCourse} />
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, minmax(0, 300px))',
                lg: 'repeat(3, minmax(0, 300px))',
              },
              gap: 3,
              mb: 8,
            }}
          >
            {enrolledCourses.map((course) => (
              <CourseDashboardCard
                key={course.courseId}
                courseId={course.courseId}
                courseName={course.courseName}
                courseInfo={course}
                data={courseData[course.courseId]}
                isLoading={loading}
                institutionId={DEFAULT_INSTITUTION}
                instance={currentTerm ?? 'latest'}
              />
            ))}
          </Box>
        )}

        <ExploreCoursesSection
          courses={filteredCourses}
          currentTerm={currentTerm}
          exploreCoursesTitle={localeHome.exploreCourses || 'Explore courses'}
          exploreCoursesButtonLabel={localeHome.exploreOurCourse}
        />
      </Box>

      <VollKiInfoSection />
    </MainLayout>
  );
}
