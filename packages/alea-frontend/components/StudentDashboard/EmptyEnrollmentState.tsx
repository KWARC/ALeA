import { Box, Button, Typography } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getLocaleObject } from '../../lang/utils';
import type { EmptyEnrollmentStateProps } from './types';

export function EmptyEnrollmentState({ exploreCoursesLabel }: EmptyEnrollmentStateProps) {
  const t = getLocaleObject(useRouter()).studentWelcomeScreen;
  return (
    <Box
      sx={{
        py: 8,
        px: 3,
        textAlign: 'center',
        borderRadius: 3,
        bgcolor: 'background.paper',
        border: '2px dashed',
        borderColor: 'divider',
      }}
    >
      <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
        {t.notEnrolled}
      </Typography>
      <Button
        component={Link}
        href="/course-list"
        variant="contained"
        size="large"
        disableElevation
      >
        {exploreCoursesLabel}
      </Button>
    </Box>
  );
}
