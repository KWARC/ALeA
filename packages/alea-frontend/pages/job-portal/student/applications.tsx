import {
  Block,
  Cancel,
  CheckCircle,
  ExpandLess,
  ExpandMore,
  MailOutline,
  Pause,
  PendingActions,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  canAccessResource,
  getJobApplicationsByUserId,
  getJobPostById,
  getOrganizationProfile,
  updateJobApplication,
} from '@alea/spec';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import JpLayoutWithSidebar from '../../../layouts/JpLayoutWithSidebar';

const Applications = () => {
  const [companySortOrder, setCompanySortOrder] = useState('asc');
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [accessCheckLoading, setAccessCheckLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      setAccessCheckLoading(true);
      const hasAccess = await canAccessResource(ResourceName.JOB_PORTAL, Action.APPLY, {
        instanceId: CURRENT_TERM,
      });
      if (!hasAccess) {
        alert('You donot have access to this page.');
        router.push('/job-portal');
        return;
      }
      setAccessCheckLoading(false);
    };
    checkAccess();
  }, []);

  useEffect(() => {
    const fetchAppliedJobs = async () => {
      setLoading(true);
      try {
        const appliedJobsList = await getJobApplicationsByUserId();
        const jobPosts = await Promise.all(
          appliedJobsList.map((job) => getJobPostById(job?.jobPostId))
        );
        const organizationIds = [...new Set(jobPosts.map((post) => post.organizationId))];
        const organizations = await Promise.all(
          organizationIds.map((id) => getOrganizationProfile(id))
        );
        const enrichedJobs = appliedJobsList.map((job, index) => {
          const jobPost = jobPosts.find((post) => post.id === job.jobPostId);
          const organization = organizations.find((org) => org.id === jobPost?.organizationId);
          return {
            ...job,
            jobTitle: jobPost?.jobTitle,
            companyName: organization?.companyName || 'Unknown Organization',
            index: index + 1,
          };
        });

        setAppliedJobs(enrichedJobs);
      } catch (error) {
        console.error('Error fetching applied jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppliedJobs();
  }, [accessCheckLoading]);

  const handleCompanySort = () => {
    const sortedJobs = [...appliedJobs].sort((a, b) => {
      if (companySortOrder === 'asc') {
        return a.companyName.localeCompare(b.companyName);
      } else {
        return b.companyName.localeCompare(a.companyName);
      }
    });
    setCompanySortOrder(companySortOrder === 'asc' ? 'desc' : 'asc');
    setAppliedJobs(sortedJobs);
  };

  const handleAcceptOffer = async (job) => {
    await updateJobApplication({
      ...job,
      applicantAction: 'ACCEPT_OFFER',
      applicationStatus: 'OFFER_ACCEPTED',
    });
    setAppliedJobs((prevJobs) =>
      prevJobs.map((j) =>
        j.id === job.id
          ? { ...j, applicantAction: 'ACCEPT_OFFER', applicationStatus: 'OFFER_ACCEPTED' }
          : j
      )
    );
  };

  const handleRejectOffer = async (job) => {
    await updateJobApplication({
      ...job,
      applicantAction: 'REJECT_OFFER',
      applicationStatus: 'OFFER_REJECTED',
    });
    setAppliedJobs((prevJobs) =>
      prevJobs.map((j) =>
        j.id === job.id
          ? { ...j, applicantAction: 'REJECT_OFFER', applicationStatus: 'OFFER_REJECTED' }
          : j
      )
    );
  };

  const filteredJobs = appliedJobs.filter((job) => {
    switch (filter) {
      case 'ALL':
        return true;
      case 'PENDING':
        return job.applicationStatus?.toUpperCase() === 'APPLIED';
      case 'ON HOLD':
        return job.applicationStatus?.toUpperCase() === 'ON_HOLD';
      case 'SHORTLISTED FOR INTERVIEW':
        return job.applicationStatus?.toUpperCase() === 'SHORTLISTED_FOR_INTERVIEW';
      case 'REJECTED':
        return job.applicationStatus?.toUpperCase() === 'REJECTED';
      case 'OFFERED':
        return (
          job.applicationStatus?.toUpperCase() === 'OFFERED' ||
          job.applicationStatus?.toUpperCase() === 'OFFER_ACCEPTED' ||
          job.applicationStatus?.toUpperCase() === 'OFFER_REJECTED'
        );

      default:
        return true;
    }
  });
  if (accessCheckLoading || loading) {
    return <CircularProgress color="primary" />;
  }
  return (
    <Box sx={{ p: { xs: '30px 16px', md: '30px' }, maxWidth: 'lg', mx: 'auto' }}>
      <Paper sx={{ bgcolor: 'rgb(249, 249, 249)', p: { xs: 1, md: 5 } }}>
        <Box display="flex" justifyContent="center" flexWrap="wrap" gap={2} mb={2}>
          {[
            { label: 'ALL', value: 'ALL' },
            { label: 'PENDING', value: 'PENDING' },
            { label: 'ON HOLD', value: 'ON HOLD' },
            { label: 'ACCEPTED', value: 'SHORTLISTED FOR INTERVIEW' },
            { label: 'OFFERED', value: 'OFFERED' },
            { label: 'REJECTED', value: 'REJECTED' },
          ].map(({ label, value }) => (
            <Button
              key={value}
              variant={filter === value ? 'contained' : 'outlined'}
              onClick={() => setFilter(value)}
              sx={{
                flex: '1 1 150px',
                maxWidth: '250px',
                minWidth: '100px',
              }}
            >
              {label}
            </Button>
          ))}
        </Box>

        <TableContainer component={Paper} sx={{ mt: 2, overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="center">
                  <b>No.</b>
                </TableCell>
                <TableCell align="center">
                  <b>Date Applied</b>
                </TableCell>
                <TableCell align="center">
                  <b>Company</b>
                  <IconButton onClick={handleCompanySort} size="small">
                    {companySortOrder === 'asc' ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </TableCell>
                <TableCell align="center">
                  <b>Position</b>
                </TableCell>
                <TableCell align="center">
                  <b>Status</b>
                </TableCell>
                <TableCell>
                  <b>Actions</b>
                </TableCell>
              </TableRow>
            </TableHead>
            {loading ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <CircularProgress />
              </Box>
            ) : (
              <TableBody>
                {filteredJobs.length > 0 ? (
                  filteredJobs.map((jobApplication) => (
                    <TableRow key={jobApplication.id} hover>
                      <TableCell align="center">{jobApplication.index}</TableCell>
                      <TableCell align="center">
                        {new Date(jobApplication.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">{jobApplication.companyName}</TableCell>
                      <TableCell align="center">{jobApplication.jobTitle}</TableCell>
                      <TableCell align="center">
                        {jobApplication.applicationStatus === 'OFFERED' ? (
                          <Chip label="Offer Received" color="info" icon={<MailOutline />} />
                        ) : jobApplication.applicationStatus === 'SHORTLISTED_FOR_INTERVIEW' ? (
                          <Chip
                            label="Shortlisted For Interview "
                            color="primary"
                            icon={<CheckCircle />}
                          />
                        ) : jobApplication.applicationStatus === 'OFFER_ACCEPTED' ? (
                          <Chip label="Offer Accepted" color="success" icon={<CheckCircle />} />
                        ) : jobApplication.applicationStatus === 'OFFER_REJECTED' ? (
                          <Chip
                            label="Offer Rejected"
                            color="error"
                            icon={<Cancel />}
                            variant="filled"
                          />
                        ) :( jobApplication.applicationStatus === 'REJECTED'||jobApplication.applicationStatus === 'OFFER_REVOKED') ? (
                          <Chip
                            label="Application Rejected"
                            color="error"
                            icon={<Block />}
                            variant="outlined"
                          />
                        ) : jobApplication.applicationStatus === 'ON_HOLD' ? (
                          <Chip
                            label="Application Kept On Hold"
                            sx={{
                              bgcolor: '#806BE7',
                              color: 'white',
                              '& .MuiChip-icon': { color: 'white' },
                            }}
                            icon={<Pause />}
                          />
                        ) : (
                          <Chip label="Pending Review" color="warning" icon={<PendingActions />} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              onClick={() => handleAcceptOffer(jobApplication)}
                              disabled={
                                (jobApplication.applicationStatus !== 'OFFERED' &&
                                  jobApplication.applicationStatus !== 'OFFER_REJECTED') ||
                                jobApplication.applicantAction === 'ACCEPT_OFFER'
                              }
                            >
                              {jobApplication.applicantAction === 'ACCEPT_OFFER'
                                ? 'Offer Accepted'
                                : 'Accept Offer'}
                            </Button>
                          </span>

                          <span>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => handleRejectOffer(jobApplication)}
                              disabled={
                                (jobApplication.applicationStatus !== 'OFFERED' &&
                                  jobApplication.applicationStatus !== 'OFFER_ACCEPTED') ||
                                jobApplication.applicantAction === 'REJECT_OFFER'
                              }
                            >
                              {jobApplication.applicantAction === 'REJECT_OFFER'
                                ? 'Offer Rejected'
                                : 'Reject Offer'}
                            </Button>
                          </span>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body1" color="textSecondary">
                        No Job Application Found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            )}
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

const Application = () => {
  return <JpLayoutWithSidebar role="student">{<Applications />}</JpLayoutWithSidebar>;
};

export default Application;
