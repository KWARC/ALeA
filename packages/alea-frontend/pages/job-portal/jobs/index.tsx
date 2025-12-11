import { Business, CalendarToday, InfoOutlined, LocationOn, Paid } from '@mui/icons-material';
import {
  Backdrop,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Fade,
  Grid,
  IconButton,
  Modal,
  Typography,
} from '@mui/material';
import {
  canAccessResource,
  createJobApplication,
  getAllJobPosts,
  getJobApplicationsByJobPost,
  getOrganizationProfile,
  getUserInfo,
} from '@alea/spec';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import MainLayout from '../../../layouts/MainLayout';

const Jobs = () => {
  const [accessCheckLoading, setAccessCheckLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [totalJobPosts, setTotalJobPosts] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState(null);

  const [appliedJobs, setAppliedJobs] = useState([]);

  const [isOrganizationModalOpen, setIsOrganizationModalOpen] = useState(false); // Modal open/close state

  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      setAccessCheckLoading(true);
      const hasAccess = await canAccessResource(ResourceName.JOB_PORTAL, Action.APPLY, {
        instanceId: CURRENT_TERM,
      });
      if (!hasAccess) {
        alert('You do not have access to this page.');
        router.push('/job-portal');
        return;
      }
      setAccessCheckLoading(false);
    };

    checkAccess();
  }, []);

  const fetchJobPostData = async () => {
    try {
      setLoading(true);

      const res = await getAllJobPosts();
      const appliedJobsList = [];
      const enrichedJobPosts = await Promise.all(
        res.map(async (job) => {
          let organizationProfile = null;
          let alreadyApplied = false;

          try {
            const res = await getOrganizationProfile(job.organizationId);
            organizationProfile = res || null;
            console.log({ organizationProfile });
          } catch (error) {
            console.error(`Failed to fetch organization profile for job ID ${job.id}:`, error);
          }

          try {
            const application = await getJobApplicationsByJobPost(job.id);
            alreadyApplied = !!application;
            if (alreadyApplied) {
              appliedJobsList.push({
                ...job,
                organizationProfile,
                alreadyApplied,
                applicationStatus: application[0].applicationStatus || 'pending',
              });
            }
          } catch (error) {
            console.error(`Failed to fetch application data for job ID ${job.id}:`, error);
          }

          return {
            ...job,
            organizationProfile,
            alreadyApplied,
          };
        })
      );

      setTotalJobPosts(enrichedJobPosts);
      setAppliedJobs(appliedJobsList);
    } catch (error) {
      console.error('Error fetching job post data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessCheckLoading) fetchJobPostData();
  }, [accessCheckLoading]);

  const handleOpenModal = (job) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };
  const handleOpenOrganizationModal = (organization) => {
    setSelectedOrganization(organization);
    setIsOrganizationModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedJob(null);
  };
  const handleCloseOrganizationModal = () => {
    setSelectedOrganization(null);
    setIsOrganizationModalOpen(false);
  };

  const handleApply = async (jobPostId: number) => {
    try {
      const userInfo = await getUserInfo();
      if (!userInfo) return;
      const applicantId = userInfo.userId;
      console.log('applicant id is ', applicantId);
      const JobApplicationInfo = {
        jobPostId,
        applicantId,
        applicationStatus: 'applied',
      };
      await createJobApplication(JobApplicationInfo);
      // const application = await getJobApplicationsByJobPost(jobPostId);
      // console.log(" application is " , application)
      setTotalJobPosts((prevJobs) =>
        prevJobs.map((job) => (job.id === jobPostId ? { ...job, alreadyApplied: true } : job))
      );
      const appliedJob = totalJobPosts.find((job) => job.id === jobPostId);
      if (appliedJob) {
        setAppliedJobs((prev) => [...prev, { ...appliedJob, alreadyApplied: true }]);
      }
    } catch (error) {
      console.error('Error applying for this job:', error);
    }
  };

  return (
    <MainLayout title="Jobs">
      <Box
        sx={{
          height: '300px',
          background:
            'linear-gradient(to bottom, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.2)), url(/jobs-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Typography variant="h3" fontWeight="bold">
          Discover Your Next Career Opportunity
        </Typography>
        <Typography variant="h6" sx={{ mt: 2, opacity: 0.9 }}>
          Explore job openings tailored to your skills and goals.
        </Typography>
      </Box>

      <Box sx={{ padding: 3 }}>
        {loading ? (
          <Typography>Loading jobs...</Typography>
        ) : (
          <Grid container spacing={4}>
            {totalJobPosts.map((job) => (
              <Grid item xs={12} sm={6} md={4} key={job.id}>
                <Card
                  variant="outlined"
                  sx={{
                    boxShadow: 3,
                    borderRadius: 2,
                    overflow: 'hidden',
                    '&:hover': { boxShadow: 6 },
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {job.jobTitle}
                    </Typography>

                    <Box display="flex" alignItems="center" mb={1}>
                      <LocationOn fontSize="small" color="primary" />
                      <Typography variant="body2" ml={1}>
                        {job.workLocation}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Paid fontSize="small" color="secondary" />
                      <Typography variant="body2" ml={1}>
                        {job.currency} {job.stipend}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <CalendarToday fontSize="small" color="action" />
                      <Typography variant="body2" ml={1}>
                        Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Business sx={{ fontSize: '20px' }} color="secondary" />

                      <Typography variant="body2" ml={1}>
                        Company: {job.organizationProfile?.companyName || 'Unknown'}
                      </Typography>

                      {job.organizationProfile && (
                        <IconButton
                          onClick={() => handleOpenOrganizationModal(job.organizationProfile)}
                        >
                          <InfoOutlined />
                        </IconButton>
                      )}
                    </Box>
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'space-between' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      disabled={job.alreadyApplied}
                      onClick={() => handleApply(job.id)}
                    >
                      {job.alreadyApplied ? 'Already Applied' : 'Apply'}
                    </Button>
                    <IconButton onClick={() => handleOpenModal(job)}>
                      <InfoOutlined />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {selectedJob && (
        <Modal
          open={isModalOpen}
          onClose={handleCloseModal}
          closeAfterTransition
          BackdropComponent={Backdrop}
          BackdropProps={{
            timeout: 500,
          }}
        >
          <Fade in={isModalOpen}>
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 400,
                bgcolor: 'background.paper',
                boxShadow: 24,
                borderRadius: 2,
                p: 3,
              }}
            >
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {selectedJob.jobTitle}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {selectedJob.jobDescription}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Stipend: {selectedJob.currency} {selectedJob.stipend}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Open Positions: {selectedJob.openPositions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Location: {selectedJob.workLocation}
              </Typography>
              <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={handleCloseModal}>
                Close
              </Button>
            </Box>
          </Fade>
        </Modal>
      )}

      <Modal
        open={isOrganizationModalOpen}
        onClose={handleCloseOrganizationModal}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Fade in={isOrganizationModalOpen}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 500,
              bgcolor: 'background.paper',
              boxShadow: 24,
              borderRadius: 2,
              p: 3,
            }}
          >
            {selectedOrganization ? (
              <>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {selectedOrganization.companyName}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Incorporation Year: {selectedOrganization.incorporationYear || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Startup: {selectedOrganization.isStartup ? 'Yes' : 'No'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  About: {selectedOrganization.about || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Website:{' '}
                  <a href={selectedOrganization.website} target="_blank" rel="noopener noreferrer">
                    {selectedOrganization.website || 'N/A'}
                  </a>
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Company Type: {selectedOrganization.companyType || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Address: {selectedOrganization.officeAddress || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Postal Code: {selectedOrganization.officePostalCode || 'N/A'}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                  onClick={handleCloseOrganizationModal}
                >
                  Close
                </Button>
              </>
            ) : (
              <Typography>No organization data available.</Typography>
            )}
          </Box>
        </Fade>
      </Modal>

      {/* <Box sx={{ mt: 5 }}>
  <Typography variant="h4" gutterBottom>
    Jobs You Applied For
  </Typography>
  {appliedJobs.length === 0 ? (
    <Typography variant="body1" color="text.secondary">
      You haven’t applied for any jobs yet.
    </Typography>
  ) : (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><Typography fontWeight="bold">Job Title</Typography></TableCell>
            <TableCell><Typography fontWeight="bold">Company</Typography></TableCell>
            <TableCell><Typography fontWeight="bold">Status</Typography></TableCell>
            <TableCell><Typography fontWeight="bold">Actions</Typography></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {appliedJobs.map((job) => (
            <TableRow key={job.id} hover>
              <TableCell>{job.jobTitle}</TableCell>
              <TableCell>
                {job.organizationProfile?.companyName || 'Unknown Organization'}
              </TableCell>
              <TableCell>
                {job.applicationStatus === 'offered' ? (
                  <Chip
                    label="Offer Received"
                    color="primary"
                    icon={<CheckCircle />}
                    sx={{ mt: 1 }}
                  />
                ) : job.applicationStatus === 'accepted' ? (
                  <Chip
                    label="Application Accepted"
                    color="success"
                    icon={<CheckCircle />}
                    sx={{ mt: 1 }}
                  />
                ) : job.applicationStatus === 'rejected' ? (
                  <Chip
                    label="Application Rejected"
                    color="error"
                    icon={<Cancel />}
                    sx={{ mt: 1 }}
                  />
                ) : (
                  <Chip
                    label="Pending Review"
                    color="warning"
                    icon={<PendingActions />}
                    sx={{ mt: 1 }}
                  />
                )}
              </TableCell>
              <TableCell>
                {job.applicationStatus === 'offered' ? (
                  <>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      onClick={() => handleAcceptOffer(job.id)}
                      sx={{ mr: 1 }}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleDeclineOffer(job.id)}
                    >
                      Decline
                    </Button>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No actions available
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )}
</Box> */}
    </MainLayout>
  );
};

export default Jobs;
