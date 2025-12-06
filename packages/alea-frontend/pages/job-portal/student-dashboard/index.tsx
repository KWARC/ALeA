import {
  Cancel,
  CheckCircle,
  Description,
  Email,
  PendingActions,
  Phone,
  School,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Link,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  canAccessResource,
  getJobApplicationsByUserId,
  getJobPostById,
  getOrganizationProfile,
  getStudentProfile,
  JobApplicationInfo,
  StudentData,
  updateJobApplication,
  updateStudentProfile,
} from '@alea/spec';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import MainLayout from '../../../layouts/MainLayout';

const AppliedJobsDialog = ({ appliedJobs, setAppliedJobs, open, onClose }) => {
  async function handleAcceptOffer(jobApplication: JobApplicationInfo) {
    const updatedApplication = {
      ...jobApplication,
      applicantAction: 'ACCEPT_OFFER',
    };

    const response = await updateJobApplication(updatedApplication);
    setAppliedJobs((prevApplications) =>
      prevApplications.map((application) =>
        application.id === jobApplication.id
          ? { ...application, applicantAction: 'ACCEPT_OFFER' }
          : application
      )
    );
  }
  async function handleRejectOffer(jobApplication: JobApplicationInfo) {
    const updatedApplication = {
      ...jobApplication,
      applicantAction: 'REJECT_OFFER',
    };

    const response = await updateJobApplication(updatedApplication);
    setAppliedJobs((prevApplications) =>
      prevApplications.map((application) =>
        application.id === jobApplication.id
          ? { ...application, applicantAction: 'REJECT_OFFER' }
          : application
      )
    );
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>Jobs You Applied For</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {appliedJobs.length === 0 ? (
              <Typography variant="body1" color="text.secondary">
                You haven’t applied for any jobs yet.
              </Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <Typography fontWeight="bold">Job Title</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="bold">Company</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="bold">Status</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="bold">Actions</Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {appliedJobs.map((jobApplication) => (
                      <TableRow key={jobApplication.id} hover>
                        <TableCell>{jobApplication.jobTitle}</TableCell>
                        <TableCell>
                          {jobApplication?.companyName || 'Unknown Organization'}
                        </TableCell>
                        <TableCell>
                          {jobApplication.applicationStatus === 'OFFERED' ? (
                            <Chip
                              label="Offer Received"
                              color="success"
                              icon={<CheckCircle />}
                              sx={{ mt: 1 }}
                            />
                          ) : jobApplication.applicationStatus === 'ACCEPTED' ? (
                            <Chip
                              label="Application Accepted"
                              color="primary"
                              icon={<CheckCircle />}
                              sx={{ mt: 1 }}
                            />
                          ) : jobApplication.applicationStatus === 'REJECTED' ? (
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Tooltip
                              title={
                                jobApplication.applicationStatus !== 'OFFERED'
                                  ? 'Action not available until an offer is made'
                                  : 'Accept the offer'
                              }
                            >
                              <span>
                                <Button
                                  variant="contained"
                                  color="success"
                                  size="small"
                                  onClick={() => handleAcceptOffer(jobApplication)}
                                  disabled={
                                    jobApplication.applicationStatus !== 'OFFERED' ||
                                    jobApplication.applicantAction === 'ACCEPT_OFFER' ||
                                    jobApplication.applicantAction === 'REJECT_OFFER'
                                  }
                                  sx={{
                                    textTransform: 'none',
                                    ...(jobApplication.applicationStatus !== 'OFFERED' && {
                                      backgroundColor: 'rgba(76, 175, 80, 0.5)',
                                    }),
                                  }}
                                >
                                  {jobApplication.applicantAction === 'ACCEPT_OFFER'
                                    ? 'Offer Accepted'
                                    : 'Accept Offer'}
                                </Button>
                              </span>
                            </Tooltip>

                            <Tooltip
                              title={
                                jobApplication.applicationStatus !== 'OFFERED'
                                  ? 'Action not available until an offer is made'
                                  : 'Reject the offer'
                              }
                            >
                              <span>
                                <Button
                                  variant="outlined"
                                  color="error"
                                  size="small"
                                  onClick={() => handleRejectOffer(jobApplication)}
                                  disabled={
                                    jobApplication.applicationStatus !== 'OFFERED' ||
                                    jobApplication.applicantAction === 'ACCEPT_OFFER' ||
                                    jobApplication.applicantAction === 'REJECT_OFFER'
                                  }
                                  sx={{
                                    textTransform: 'none',
                                    ...(jobApplication.applicationStatus !== 'OFFERED' && {
                                      borderColor: 'rgba(244, 67, 54, 0.5)',
                                      color: 'rgba(244, 67, 54, 0.5)',
                                    }),
                                  }}
                                >
                                  {jobApplication.applicantAction === 'REJECT_OFFER'
                                    ? 'Offer Rejected'
                                    : 'Reject Offer'}
                                </Button>
                              </span>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const StudentDashboard = () => {
  const [student, setStudent] = useState<StudentData>(null);
  const [loading, setLoading] = useState(true);
  const [accessCheckLoading, setAccessCheckLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<StudentData>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

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
    if (accessCheckLoading) return;
    const fetchStudentData = async () => {
      try {
        setLoading(true);

        const res = await getStudentProfile();
        setStudent(res[0]);
        setFormData(res[0]);
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, [accessCheckLoading]);

  useEffect(() => {
    const fetchAppliedJobs = async () => {
      const appliedJobsList = await getJobApplicationsByUserId();
      const jobPosts = await Promise.all(
        appliedJobsList.map((job) => getJobPostById(job?.jobPostId))
      );
      console.log({ jobPosts });
      const organizationIds = [...new Set(jobPosts.map((post) => post.organizationId))];
      console.log({ organizationIds });
      const organizations = await Promise.all(
        organizationIds.map((id) => getOrganizationProfile(id))
      );

      console.log({ organizationIds });
      console.log({ organizations });
      const enrichedJobs = appliedJobsList.map((job, index) => {
        const jobPost = jobPosts.find((post) => post.id === job.jobPostId);

        // const jobPost = jobPosts[job.jobPostId];
        console.log({ jobPost });
        const organization = organizations.find((org) => org.id === jobPost?.organizationId);
        // const organization = organizations[jobPost?.organizationId];
        console.log({ organization });
        return {
          ...job,
          jobTitle: jobPost?.jobTitle,
          companyName: organization?.companyName || 'Unknown Organization',
        };
      });
      console.log(enrichedJobs);

      setAppliedJobs(enrichedJobs);
    };
    fetchAppliedJobs();
  }, []);

  console.log({ appliedJobs });
  const handleInputChange =
    (field: keyof StudentData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, [field]: event.target.value });
      setErrors({ ...errors, [field]: '' });
    };
  const validateFields = () => {
    const newErrors: { [key: string]: string } = {};

    [
      'name',
      'email',
      'mobile',
      'programme',
      'yearOfAdmission',
      'yearOfGraduation',
      'about',
      'courses',
      'gpa',
    ].forEach((field) => {
      if (!formData?.[field]) {
        newErrors[field] = 'This field is required';
      }
    });

    if (formData?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData?.mobile && !/^\d{10}$/.test(formData.mobile)) {
      newErrors.mobile = 'Phone number must be 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditSubmit = async () => {
    if (!validateFields()) return;

    try {
      await updateStudentProfile(formData as any); // TODO JP
      setStudent(formData);
      setDialogOpen(false);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error updating student profile:', error);
    }
  };

  if (accessCheckLoading || loading) {
    return <CircularProgress color="primary" />;
  }

  if (!student) {
    return (
      <MainLayout title="Job-Portal">
        <Box textAlign="center" mt={10}>
          <Typography variant="h6" color="error">
            You are currently not registered on job portal, Register first to access student
            dashboard
          </Typography>
        </Box>
      </MainLayout>
    );
  }

  const {
    name,
    resumeUrl,
    email,
    mobile,
    programme,
    yearOfAdmission,
    yearOfGraduation,
    courses,
    gpa,
    about,
  } = student;

  return (
    <MainLayout title="Student Dashboard | Job Portal">
      <Box>
        <Box
          sx={{
            py: 3,
            backgroundColor: 'primary.main',
            color: 'white',
            textAlign: 'center',
            mb: 4,
          }}
        >
          <Typography variant="h4" fontWeight="bold">
            Student Dashboard
          </Typography>
          <Typography variant="subtitle1">Your academic profile at a glance</Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            gap: '16px',
            ml: '30px',
          }}
        >
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            Edit Profile
          </Button>
          <Button variant="contained" onClick={() => router.push('/job-portal/jobs')}>
            Jobs Available
          </Button>
          <Box>
            <Button variant="contained" onClick={handleOpen}>
              Jobs Applied
            </Button>
          </Box>
          <AppliedJobsDialog
            appliedJobs={appliedJobs}
            setAppliedJobs={setAppliedJobs}
            open={open}
            onClose={handleClose}
          />
        </Box>

        <Box sx={{ px: { xs: 2, md: 4 }, py: 2 }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <School />
                    </Avatar>
                    <Typography variant="h6">Personal Information</Typography>
                  </Box>
                  <Typography>
                    <strong>Name:</strong> {name}
                  </Typography>
                  <Typography>
                    <Email sx={{ verticalAlign: 'middle', mr: 1 }} />
                    <strong>Email:</strong> {email}
                  </Typography>
                  <Typography>
                    <Phone sx={{ verticalAlign: 'middle', mr: 1 }} />
                    <strong>Phone:</strong> {mobile}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                      <Description />
                    </Avatar>
                    <Typography variant="h6">Academic Information</Typography>
                  </Box>
                  <Typography>
                    <strong>Programme:</strong> {programme}
                  </Typography>
                  <Typography>
                    <strong>Year of Admission:</strong> {yearOfAdmission}
                  </Typography>
                  <Typography>
                    <strong>Year of Graduation:</strong> {yearOfGraduation}
                  </Typography>
                  <Typography>
                    <strong>About:</strong> {about || 'No details provided'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Course & Grade
                  </Typography>
                  {courses && gpa ? (
                    <Box>
                      <Typography>
                        <strong>Course:</strong> {courses}
                      </Typography>
                      <Typography>
                        <strong>Grade:</strong> {gpa}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography>No course or grade information available</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Resume
                  </Typography>
                  {resumeUrl ? (
                    <Link
                      href={resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      underline="none"
                    >
                      <Button variant="contained" color="primary" sx={{ textTransform: 'none' }}>
                        View Resume
                      </Button>
                    </Link>
                  ) : (
                    <Typography>No resume uploaded</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        BackdropProps={{
          style: {
            backdropFilter: 'blur(5px)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', textAlign: 'center' }}>
          Edit Profile
        </DialogTitle>
        <DialogContent sx={{ padding: 3 }}>
          <br />
          <br />
          <Grid container spacing={3}>
            {[
              { label: 'Name', field: 'name', placeholder: 'Enter your name' },
              { label: 'Email', field: 'email', placeholder: 'Enter your email' },
              { label: 'Phone', field: 'mobile', placeholder: 'Enter your phone number' },
              { label: 'Programme', field: 'programme', placeholder: 'Enter your programme' },
              {
                label: 'Year of Admission',
                field: 'yearOfAdmission',
                placeholder: 'Enter year of admission',
              },
              {
                label: 'Year of Graduation',
                field: 'yearOfGraduation',
                placeholder: 'Enter year of graduation',
              },
              { label: 'Courses', field: 'courses', placeholder: 'List your courses' },
              { label: 'GPA', field: 'gpa', placeholder: 'List your gpa' },
              {
                label: 'About',
                field: 'about',
                placeholder: 'Tell us about yourself',
                multiline: true,
              },
              { label: 'Resume URL', field: 'resumeUrl', placeholder: 'Enter your resume link' },
            ].map(({ label, field, placeholder, multiline }) => (
              <Grid item xs={12} sm={6} key={field}>
                <TextField
                  fullWidth
                  variant="outlined"
                  label={label}
                  placeholder={placeholder}
                  multiline={multiline}
                  rows={multiline ? 4 : 1}
                  value={formData?.[field] || ''}
                  onChange={handleInputChange(field as keyof StudentData)}
                  error={!!errors[field]}
                  helperText={errors[field]}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', padding: 2 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            variant="outlined"
            color="secondary"
            sx={{
              borderColor: 'secondary.main',
              color: 'secondary.main',
              '&:hover': {
                borderColor: 'primary.main',
                color: 'primary.main',
              },
            }}
          >
            Cancel
          </Button>

          <Button onClick={handleEditSubmit} variant="contained" color="primary">
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert onClose={() => setSnackbarOpen(false)} severity="success">
          Profile updated successfully!
        </Alert>
      </Snackbar>
    </MainLayout>
  );
};

export default StudentDashboard;
