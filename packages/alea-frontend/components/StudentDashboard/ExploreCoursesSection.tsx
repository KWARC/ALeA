import { Box, Button, Typography } from '@mui/material';
import Link from 'next/link';
import { CourseCard } from '../../pages';
import type { ExploreCoursesSectionProps } from './types';

export function ExploreCoursesSection({
  courses,
  currentTerm,
  exploreCoursesTitle,
  exploreCoursesButtonLabel,
}: ExploreCoursesSectionProps) {
  if (courses.length === 0) return null;

  return (
    <Box sx={{ pt: 6, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography
        variant="h5"
        fontWeight={600}
        color="text.primary"
        sx={{ mb: 3, textAlign: 'center' }}
      >
        {exploreCoursesTitle}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 3,
        }}
      >
        {courses.map((course) => (
          <CourseCard key={course.courseId} course={course} currentTerm={currentTerm} />
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Link href="/course-list" style={{ textDecoration: 'none' }}>
          <Button variant="outlined" size="large" disableElevation>
            {exploreCoursesButtonLabel}
          </Button>
        </Link>
      </Box>
    </Box>
  );
}
