import { Alert, Box, Button, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import MainLayout from '../layouts/MainLayout';

interface RouteErrorDisplayProps {
  validationError: string;
  institutionId?: string;
  courseId?: string;
  instance?: string;
}

export function RouteErrorDisplay({
  validationError,
  institutionId,
  courseId,
  instance,
}: RouteErrorDisplayProps) {
  const router = useRouter();

  const getErrorTitle = () => {
    if (validationError === 'Invalid institutionId') return 'Invalid Institution ID';
    if (validationError === 'Invalid courseId') return 'Invalid Course ID';
    if (validationError === 'Invalid instanceId') return 'Invalid Instance ID';
    return 'Error';
  };

  const getErrorMessage = () => {
    if (validationError === 'Invalid institutionId') {
      return `The institution "${institutionId}" does not exist.`;
    }
    if (validationError === 'Invalid courseId') {
      return `The course "${courseId}" does not exist.`;
    }
    if (validationError === 'Invalid instanceId') {
      return `The instance "${instance}" does not exist for institution "${institutionId}".`;
    }
    return validationError;
  };

  return (
    <MainLayout title="Error | ALeA">
      <Box sx={{ textAlign: 'center', mt: 10, px: 2 }}>
        <Alert severity="error" sx={{ maxWidth: '600px', margin: 'auto', p: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
            {getErrorTitle()}
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, mb: 2 }}>
            {getErrorMessage()}
          </Typography>
          <Typography variant="body2" sx={{ mt: 2, mb: 2, color: 'text.secondary' }}>
            Redirecting to home page in a few seconds...
          </Typography>
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => router.push('/')}
          >
            Go to Home Now
          </Button>
        </Alert>
      </Box>
    </MainLayout>
  );
}
