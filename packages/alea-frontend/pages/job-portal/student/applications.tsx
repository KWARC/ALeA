import {
  Block,
  Cancel,
  CheckCircle,
  ExpandLess,
  ExpandMore,
  History,
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
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';
import {
  ApplicationWithJobAndOrgTitle,
  canAccessResource,
  getJobApplicationsByUserId,
  getJobPostById,
  getOrganizationProfile,
  updateJobApplication,
} from '@alea/spec';
import JobApplicationTimelineModal from '../../../components/job-portal/ApplicationTimelineModal';
import JpLayoutWithSidebar from '../../../layouts/JpLayoutWithSidebar';

const Applications = () => {
  const [companySortOrder, setCompanySortOrder] = useState('asc');
  const [applications, setApplications] = useState<ApplicationWithJobAndOrgTitle[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [showTimeline, setShowTimeline] = useState(false);
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
        const applications = await getJobApplicationsByUserId();
        const jobPosts = await Promise.all(
          applications.map((job) => getJobPostById(job?.jobPostId))
        );
        const organizationIds = [...new Set(jobPosts.map((post) => post.organizationId))];
        const organizations = await Promise.all(
          organizationIds.map((id) => getOrganizationProfile(id))
        );
        const enrichedApplications = applications.map((application) => {
          const jobPost = jobPosts.find((post) => post.id === application.jobPostId);
          const organization = organizations.find((org) => org.id === jobPost?.organizationId);
          return {
            ...application,
            jobTitle: jobPost?.jobTitle,
            companyName: organization?.companyName || 'Unknown Organization',
          };
        });

        setApplications(enrichedApplications);
      } catch (error) {
        console.error('Error fetching applied jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppliedJobs();
  }, [accessCheckLoading]);

  const handleCompanySort = () => {
    const sortedApplications = [...applications].sort((a, b) => {
      if (companySortOrder === 'asc') {
        return a.companyName.localeCompare(b.companyName);
      } else {
        return b.companyName.localeCompare(a.companyName);
      }
    });
    setCompanySortOrder(companySortOrder === 'asc' ? 'desc' : 'asc');
    setApplications(sortedApplications);
  };

  const handleAcceptOffer = async (application: ApplicationWithJobAndOrgTitle) => {
    try {
      await updateJobApplication({
        id: application.id,
        action: 'ACCEPT_OFFER',
        // message:''//TODO
      });
      setApplications((prevApplications) =>
        prevApplications.map((prev) =>
          prev.id === application.id ? { ...prev, applicationStatus: 'OFFER_ACCEPTED' } : prev
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectOffer = async (application: ApplicationWithJobAndOrgTitle) => {
    try {
      await updateJobApplication({
        id: application.id,
        action: 'REJECT_OFFER',
        // message:''//TODO
      });
      setApplications((prevApplications) =>
        prevApplications.map((prev) =>
          prev.id === application.id ? { ...prev, applicationStatus: 'OFFER_REJECTED' } : prev
        )
      );
    } catch (err) {
      console.error(err);
    }
  };
  const handleOpenTimeline = () => setShowTimeline(true);
  const handleCloseTimeline = () => setShowTimeline(false);
  const filteredApplications = applications.filter((application) => {
    switch (filter) {
      case 'ALL':
        return true;
      case 'PENDING':
        return application.applicationStatus?.toUpperCase() === 'APPLIED';
      case 'ON HOLD':
        return application.applicationStatus?.toUpperCase() === 'ON_HOLD';
      case 'SHORTLISTED FOR INTERVIEW':
        return application.applicationStatus?.toUpperCase() === 'SHORTLISTED_FOR_INTERVIEW';
      case 'REJECTED':
        return application.applicationStatus?.toUpperCase() === 'REJECTED';
      case 'OFFERED':
        return (
          application.applicationStatus?.toUpperCase() === 'OFFERED' ||
          application.applicationStatus?.toUpperCase() === 'OFFER_ACCEPTED' ||
          application.applicationStatus?.toUpperCase() === 'OFFER_REJECTED'
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
                {filteredApplications.length > 0 ? (
                  filteredApplications.map((jobApplication, idx) => (
                    <TableRow key={jobApplication.id} hover>
                      <TableCell align="center">{idx + 1}</TableCell>
                      <TableCell align="center">
                        <Box display="flex" gap={0.5} justifyContent="center" alignItems="center">
                          {new Date(jobApplication.createdAt).toLocaleDateString()}
                          <Tooltip title="View Application Timeline" arrow>
                            <IconButton color="info" size="small" onClick={handleOpenTimeline}>
                              <History fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <JobApplicationTimelineModal
                          open={showTimeline}
                          applicationId={jobApplication.id}
                          onClose={handleCloseTimeline}
                        />
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
                        ) : jobApplication.applicationStatus === 'REJECTED' ||
                          jobApplication.applicationStatus === 'OFFER_REVOKED' ? (
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
                                jobApplication.applicationStatus !== 'OFFERED' &&
                                jobApplication.applicationStatus !== 'OFFER_REJECTED'
                              }
                            >
                              {jobApplication.applicationStatus === 'OFFER_ACCEPTED'
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
                                jobApplication.applicationStatus !== 'OFFERED' &&
                                jobApplication.applicationStatus !== 'OFFER_ACCEPTED'
                              }
                            >
                              {jobApplication.applicationStatus === 'OFFER_REJECTED'
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
  return (
    <JpLayoutWithSidebar
      role="student"
      title="Applications | Job Portal - ALeA"
      description="View and manage your job applications submitted through the ALeA Job Portal"
    >
      {<Applications />}
    </JpLayoutWithSidebar>
  );
};

export default Application;
