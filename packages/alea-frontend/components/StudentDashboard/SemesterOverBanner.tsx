import { Box, Button, Typography } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getLocaleObject } from '../../lang/utils';
import type { SemesterOverBannerProps } from './types';

export function SemesterOverBanner({ courseHomeHref }: SemesterOverBannerProps) {
  const router = useRouter();
  const t = getLocaleObject(router).semesterOverBanner;

  return (
    <Box
      sx={{
        py: 2,
        px: 2,
        mb: 2,
        borderRadius: 2,
        bgcolor: 'action.hover',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="body1" fontWeight={600} color="text.secondary">
        {t.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t.description}
      </Typography>
      <Button component={Link} href={courseHomeHref} size="small" sx={{ mt: 1.5 }}>
        {t.openCourse}
      </Button>
    </Box>
  );
}
