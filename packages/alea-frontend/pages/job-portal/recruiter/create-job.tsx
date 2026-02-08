import {
  Box,
  Button,
  CircularProgress,
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
  JobPostFormData,
  RecruiterData,
} from '@alea/spec';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  EligibilityForm,
  JobDescriptionsForm,
  JobList,
  OfferDetailsForm,
} from '../../../components/job-portal/JobList';
import JpLayoutWithSidebar from '../../../layouts/JpLayoutWithSidebar';

export type ValidationErrors = Partial<Record<keyof JobPostFormData, string>>;

export function validateJobPost(data: JobPostFormData, step?: number): ValidationErrors {
  const errors: ValidationErrors = {};

  if (step === 0 || step === undefined) {
    if (!data.jobCategoryId) errors.jobCategoryId = 'Job category is required';
    if (!data.jobTitle.trim()) errors.jobTitle = 'Job title is required';
    if (!data.workMode) errors.workMode = 'Work mode is required';
  }

  if (step === 2 || step === undefined) {
    if (!data.qualification) errors.qualification = 'Qualification is required';
    if (!data.applicationDeadlineTimestamp_ms) errors.applicationDeadlineTimestamp_ms = 'Deadline is required';
  }

  return errors;
}

const JobPostPage = () => {
  const router = useRouter();
  const [recruiter, setRecruiter] = useState<RecruiterData>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [jobCategories, setJobCategories] = useState<JobCategoryInfo[]>([]);
  const initialJobPostFormData: JobPostFormData = {
    jobCategoryId: null,
    session: '',
    jobTitle: '',
    workLocation: '',
    workMode: '',
    applicationDeadlineTimestamp_ms: null,
    facilities: '',
    compensation: {
      type: 'salary',
      mode: 'fixed',
      fixedAmount: null,
      minAmount: null,
      maxAmount: null,
      currency: 'EUR',
      frequency: 'yearly',
    },
    graduationYears: '',
    openPositions: null,
    qualification: '',
    jobDescription: '',
  };
  const [jobPostFormData, setJobPostFormData] = useState<JobPostFormData>(initialJobPostFormData);
  const [errors, setErrors] = useState<ValidationErrors>({});

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
        { orgId: String(recruiterData?.organizationId) }
      );

      if (!hasAccess) {
        alert('You do not have access to this page.');
        router.push('/job-portal');
        return;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      router.push('/job-portal');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setJobPostFormData({ ...jobPostFormData, [name]: value });
    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
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

  useEffect(() => {
    const selectedId = jobPostFormData.jobCategoryId;
    if (!selectedId) return;
    const selectedJob = jobCategories.find((job) => job.id === selectedId);
    if (!selectedJob) return;
    const categoryName = selectedJob.jobCategory; 
    setJobPostFormData((prevData) => ({
      ...prevData,
      session: `${categoryName}(${CURRENT_TERM})`,
      compensation: {
        ...prevData.compensation,
        frequency: categoryName.toLowerCase() === 'full-time' ? 'yearly' : 'monthly',
        type: categoryName.toLowerCase() === 'full-time' ? 'salary' : 'stipend',
      },
    }));
  }, [jobPostFormData.jobCategoryId, jobCategories]);

  const handleNext = async () => {
    const validationErrors = validateJobPost(jobPostFormData, activeStep);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    if (activeStep < 2) {
      setActiveStep((prev) => prev + 1);
      return;
    }
    if (!recruiter?.organizationId) {
      alert('Missing required data');
      return;
    }
    const jobPostPayload = {
      ...jobPostFormData,
      organizationId: recruiter.organizationId,
    };
    try {
      setLoading(true);
      await createJobPost(jobPostPayload);
      setJobPostFormData(initialJobPostFormData);
      setActiveStep(0);
      fetchData();
      alert('New job created!');
    } catch (error) {
      console.error(error);
      alert('Failed to create job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);
  const hasErrors = Object.values(errors ?? {}).some(Boolean);
  const isFinalStep = activeStep === 2;
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
          bgcolor: '#ededed',
          p: 5,
          borderRadius: '20px',
          position: 'relative',
        }}
      >
        <Typography variant="h4" fontWeight="bold">
          Create a New Job Post
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
            <JobDescriptionsForm
              formData={jobPostFormData}
              handleChange={handleChange}
              errors={errors}
              jobCategories={jobCategories}
            />
          )}
          {activeStep === 1 && (
            <OfferDetailsForm
              formData={jobPostFormData}
              handleChange={handleChange}
              errors={errors}
            />
          )}
          {activeStep === 2 && (
            <EligibilityForm
              formData={jobPostFormData}
              handleChange={handleChange}
              errors={errors}
            />
          )}
        </Box>
        <Box justifyContent="space-between" sx={{ mt: 4 }} display={'flex'}>
          <Button
            variant="outlined"
            onClick={() => {
              setJobPostFormData(initialJobPostFormData);
              setActiveStep(0);
            }}
          >
            Cancel
          </Button>
          <Box>
            {activeStep > 0 && (
              <Button onClick={handleBack} sx={{ mr: 2 }}>
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              variant="contained"
              disabled={loading || (isFinalStep && hasErrors)}
            >
              {activeStep === 2 ? 'Submit' : 'Next'}
            </Button>
          </Box>
        </Box>
      </Box>
      <JobList recruiter={recruiter} jobCategories ={jobCategories} />
    </Box>
  );
};
const CreateJob = () => {
  return (
    <JpLayoutWithSidebar
      role="recruiter"
      title="Create Job | Job Portal - ALeA"
      description="Create and publish new job openings for students on the ALeA Job Portal"
    >
      {<JobPostPage />}
    </JpLayoutWithSidebar>
  );
};

export default CreateJob;
