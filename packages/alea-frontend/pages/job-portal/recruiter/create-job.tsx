import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import {
  canAccessResource,
  createJobPost,
  getJobCategories,
  getRecruiterProfile,
  JobCategoryInfo,
  JobPostInfo,
  RecruiterData,
  updateJobPost,
} from '@stex-react/api';
import { Action, CURRENT_TERM, ResourceName } from '@stex-react/utils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  EligibilityForm,
  JobDescriptionsForm,
  JobList,
  OfferDetailsForm,
} from '../../../components/job-portal/JobList';
import JpLayoutWithSidebar from '../../../layouts/JpLayoutWithSidebar';

const JobPostPage = () => {
  const router = useRouter();
  const [recruiter, setRecruiter] = useState<RecruiterData>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedJob, setSelectedJob] = useState<JobPostInfo>(null);
  const [jobCategories, setJobCategories] = useState<JobCategoryInfo[]>([]);
  const [selectedJobCategory, setSelectedJobCategory] = useState<string>('');
  const [selectedJobCategoryId, setSelectedJobCategoryId] = useState<number>(null);
  const [isFormDisabled, setIsFormDisabled] = useState(true);
  const [jobPostFormData, setJobPostFormData] = useState({
    session: '',
    jobTitle: '',
    trainingLocation: '',
    applicationDeadline: null,
    currency: '',
    stipend: null,
    facilities: '',
    targetYears: '',
    openPositions: null,
    qualification: '',
    jobDescription: '',
  });

  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      setLoading(true);
      const recruiterData = await getRecruiterProfile();
      setRecruiter(recruiterData);
      const hasAccess = await canAccessResource(
        ResourceName.JOB_PORTAL_ORG,
        Action.MANAGE_JOB_POSTS,
        { orgId: String(recruiterData.organizationId) }
      );

      if (!hasAccess) {
        alert('You do not have access to this page.');
        router.push('/job-portal');
        return;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setJobPostFormData({ ...jobPostFormData, [name]: value });
  };

  useEffect(() => {
    const fetchJobCategoryData = async () => {
      try {
        setLoading(true);
        const res = await getJobCategories(CURRENT_TERM);
        setJobCategories(res);
      } catch (error) {
        console.error('Error fetching job categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobCategoryData();
  }, []);

  const handleJobCategoryChange = (event: any) => {
    const selectedId = event.target.value;
    setSelectedJobCategoryId(Number(selectedId));
    const selectedJob = jobCategories.find((job) => job.id === selectedId);
    if (selectedJob) {
      setSelectedJobCategory(selectedJob.jobCategory);
    }
  };
  useEffect(() => {
    if (selectedJobCategory) {
      setJobPostFormData((prevData) => ({
        ...prevData,
        session: `${selectedJobCategory}(${CURRENT_TERM})`,
      }));
      setIsFormDisabled(false);
    }
  }, [selectedJobCategory]);
  const handleNext = async () => {
    if (activeStep < 2) {
      setActiveStep((prev) => prev + 1);
    } else {
      const jobPostPayload = {
        ...jobPostFormData,
        jobCategoryId: selectedJobCategoryId,
        organizationId: recruiter?.organizationId,
      };

      if (!selectedJob) {
        setIsFormDisabled(true);
        setLoading(true);
        await createJobPost(jobPostPayload);
      } else {
        await updateJobPost({ ...jobPostPayload, id: selectedJob.id });
      }

      setSelectedJob(null);
      fetchData();
      setIsFormDisabled(false);
      setLoading(false);
      alert('New job created!');
    }
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);
  if (loading) return <CircularProgress />;
  return (
    <Box
      sx={{
        mt: 1,
        textAlign: 'center',
        borderRadius: '40px',
        bgcolor: '#f2f2f2',
        p: { xs: '30px 16px', md: '30px' },
        maxWidth: 'md',
        mx: 'auto',
      }}
    >
      <Box
        sx={{
          backgroundColor: '#ebecf0',
          borderRadius: '16px',
          mb: '10px',
        }}
      >
        <FormControl fullWidth variant="outlined" sx={{ marginBottom: 2, bgcolor: 'white' }}>
          <InputLabel id="job-category-select-label">Select Job Category</InputLabel>
          <Select
            labelId="job-category-select-label"
            value={selectedJobCategoryId}
            onChange={handleJobCategoryChange}
            label="Select Job Category"
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              },
              '& .MuiSelect-icon': {
                right: 8,
              },
            }}
          >
            {jobCategories.map((job, index) => (
              <MenuItem key={index} value={job.id}>
                {job.jobCategory}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box
        sx={{
          bgcolor: '#ededed',
          p: 5,
          borderRadius: '20px',
        }}
      >
        {isFormDisabled && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(64, 56, 64, 0.2)', // Translucent overlay
              borderRadius: '20px',
              zIndex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {loading && (
              <Box>
                <CircularProgress />
              </Box>
            )}
          </Box>
        )}
        <Typography variant="h4" fontWeight="bold">
          {selectedJob ? 'Update Job Post' : 'Create a New Job Post'}
        </Typography>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mt: 4 }}>
          {['Job Descriptions', 'Offer Details', 'Eligibility'].map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Box sx={{ mt: 3 }}>
          {activeStep === 0 && (
            <JobDescriptionsForm formData={jobPostFormData} handleChange={handleChange} />
          )}
          {activeStep === 1 && (
            <OfferDetailsForm formData={jobPostFormData} handleChange={handleChange} />
          )}
          {activeStep === 2 && (
            <EligibilityForm formData={jobPostFormData} handleChange={handleChange} />
          )}
        </Box>
        <Box justifyContent="space-between" sx={{ mt: 4 }} display={'flex'}>
          <Button onClick={() => router.push('/dashboard')} variant="outlined">
            Cancel
          </Button>
          <Box>
            {activeStep > 0 && (
              <Button onClick={handleBack} sx={{ mr: 2 }}>
                Back
              </Button>
            )}
            <Button onClick={handleNext} variant="contained">
              {activeStep === 2 ? 'Submit' : 'Next'}
            </Button>
          </Box>
        </Box>
      </Box>
      <JobList recruiter={recruiter} />
    </Box>
  );
};
const CreateJob = () => {
  return <JpLayoutWithSidebar role="recruiter">{<JobPostPage />}</JpLayoutWithSidebar>;
};

export default CreateJob;
