import { Box, Typography } from '@mui/material';
import MainLayout from '../layouts/MainLayout';
import { BG_COLOR } from '@alea/utils';

interface CourseNotFoundProps {
  bgColor?: string;
}

export function CourseNotFound({ bgColor = BG_COLOR }: CourseNotFoundProps) {
  return (
    <MainLayout title="Error | ALeA" bgColor={bgColor}>
      <Box sx={{ textAlign: 'center', mt: 10 }}>
        <Typography variant="h5">Course Not Found!</Typography>
      </Box>
    </MainLayout>
  );
}
