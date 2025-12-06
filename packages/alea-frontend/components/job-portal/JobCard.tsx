import {
  AttachMoney,
  Business,
  Close,
  Event,
  LocationOn,
  MonetizationOn,
  People,
  Work,
} from '@mui/icons-material';
import { Box, Button, Divider, Modal, Stack, Typography } from '@mui/material';
import { getOrganizationProfile } from '@alea/spec';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const JobDetails = ({ job }) => {
  const [organizationName, setOrganizationName] = useState('');

  useEffect(() => {
    const fetchOrganization = async () => {
      const orgDetail = await getOrganizationProfile(job.organizationId);
      setOrganizationName(orgDetail?.companyName || 'N/A');
    };
    fetchOrganization();
  }, [job.organizationId]);

  return (
    <Box mt={3} p={3} borderRadius={2} boxShadow={3} bgcolor="background.paper">
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        {job.jobTitle}
      </Typography>

      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <Business fontSize="small" color="primary" />
        <Typography variant="body1">{organizationName}</Typography>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <LocationOn fontSize="small" color="action" />
        <Typography variant="body2">{job.trainingLocation}</Typography>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <MonetizationOn fontSize="small" color="success" />
        <Typography variant="body2">
          {job.stipend} {job.currency}
        </Typography>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <Event fontSize="small" color="error" />
        <Typography variant="body2">
          Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
        </Typography>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Box mb={2}>
        <Typography variant="subtitle1" fontWeight="bold">
          Job Description
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {job.jobDescription}
        </Typography>
      </Box>

      <Box mb={2}>
        <Typography variant="subtitle1" fontWeight="bold">
          Qualification
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {job.qualification}
        </Typography>
      </Box>

      <Box mb={2}>
        <Typography variant="subtitle1" fontWeight="bold">
          Session
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {job.session}
        </Typography>
      </Box>

      <Box mb={2}>
        <Typography variant="subtitle1" fontWeight="bold">
          Facilities
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {job.facilities}
        </Typography>
      </Box>

      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <People fontSize="small" color="primary" />
          <Typography variant="subtitle1" fontWeight="bold">
            Open Positions:
          </Typography>
          <Typography variant="body2">{job.openPositions}</Typography>
        </Stack>
      </Box>
    </Box>
  );
};
export const JobCard = ({ job, hideJobRedirect = false }) => {
  const [open, setOpen] = useState(false);

  const handleToggleDetails = () => setOpen((prev) => !prev);
  const router = useRouter();
  return (
    <Box
      sx={{
        flex: '1 1 200px',
        borderRadius: '15px',
        boxShadow: 3,
        p: 2,
        bgcolor: '#fff',
      }}
    >
      <Box display="flex" gap={1}>
        <Work color="primary" />
        <Typography variant="h6" fontWeight="bold" minHeight={{ md: '64px' }}>
          {job.jobTitle}
        </Typography>
      </Box>

      <Box display="flex" alignItems="center" gap={1} mt={1}>
        <Business color="secondary" />
        <Typography variant="body1">{job.organizationId}</Typography>
      </Box>

      <Box display="flex" alignItems="center" gap={1} mt={1}>
        <LocationOn color="action" />
        <Typography variant="body2">{job.trainingLocation}</Typography>
      </Box>

      <Box display="flex" alignItems="center" gap={1} mt={1}>
        <AttachMoney color="success" />
        <Typography variant="body2">
          {job.stipend} {job.currency}
        </Typography>
      </Box>

      <Box display="flex" alignItems="center" gap={1} mt={1}>
        <Event color="error" />
        <Typography variant="body2">
          Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
        </Typography>
      </Box>

      <Box m={2} display="flex" flexWrap="wrap" gap={2} justifyContent="center">
        <Button
          variant="outlined"
          color="primary"
          onClick={handleToggleDetails}
          sx={{ flex: 1, minWidth: '200px' }}
        >
          More Details
        </Button>
        {!hideJobRedirect && (
          <Button
            variant="contained"
            onClick={() => router.push('/job-portal/search-job')}
            sx={{ flex: 1, minWidth: '200px' }}
          >
            Go To Job Page
          </Button>
        )}
      </Box>

      <Modal open={open} onClose={handleToggleDetails}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: 600,
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: 24,
            p: 4,
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">
              Job Details
            </Typography>
            <Button onClick={handleToggleDetails}>
              <Close />
            </Button>
          </Box>
          <JobDetails job={job} />
        </Box>
      </Modal>
    </Box>
  );
};
