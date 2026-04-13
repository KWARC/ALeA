import { Box, Button, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import MainLayout from '../layouts/MainLayout';

export function CourseNotFound() {
  const router = useRouter();

  return (
    <MainLayout title="Course Not Found | ALeA">
      <Box sx={{ textAlign: 'center', mt: 10, px: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
          Course not found
        </Typography>
        <Typography variant="body1" sx={{ mt: 2, mb: 2, color: 'text.secondary' }}>
          The course or instance you are looking for could not be loaded.
        </Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => router.push('/')}>
          Go to Home
        </Button>
      </Box>
    </MainLayout>
  );
}
