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
  Tooltip,
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
    if (!data.jobTitle.trim()) errors.jobTitle = 'Job title is required';
    if (!data.workMode) errors.workMode = 'Work mode is required';
  }

  if (step === 1 || step === undefined) {
    const c = data.compensation;

    if (c.mode === 'fixed') {
      if (!c.fixedAmount) errors.compensation = 'Fixed amount is required';
    }

    if (c.mode === 'range') {
      const { minAmount, maxAmount } = c;

      if (minAmount == null && maxAmount == null) {
        errors.compensation = 'Min or Max amount is required';
      } else if (minAmount != null && maxAmount != null && minAmount > maxAmount) {
        errors.compensation = 'Min amount must be less than Max amount';
      }
    }

    if (!c.currency) errors.compensation = 'Currency is required';
    if (!c.frequency) errors.compensation = 'Frequency is required';
  }

  if (step === 2 || step === undefined) {
    if (!data.qualification) errors.qualification = 'Qualification is required';
    if (!data.targetYears) errors.targetYears = 'Target year is required';
    if (!data.applicationDeadline) errors.applicationDeadline = 'Deadline is required';
  }

  return errors;
}

const JobPostPage = () => {
  const router = useRouter();
  const [recruiter, setRecruiter] = useState<RecruiterData>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [jobCategories, setJobCategories] = useState<JobCategoryInfo[]>([]);
  const [selectedJobCategory, setSelectedJobCategory] = useState<string>('');
  const [selectedJobCategoryId, setSelectedJobCategoryId] = useState<number>(null);
  const [isFormDisabled, setIsFormDisabled] = useState(true);
  const initialJobPostFormData: JobPostFormData = {
    session: '',
    jobTitle: '',
    workLocation: '',
    workMode: '',
    applicationDeadline: '',
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
    targetYears: '',
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

  const handleJobCategoryChange = (event: any) => {
    const selectedId = event.target.value;
    setSelectedJobCategoryId(Number(selectedId));
    const selectedJobCategory = jobCategories.find((job) => job.id === selectedId);
    if (selectedJobCategory) {
      setSelectedJobCategory(selectedJobCategory.jobCategory);
    }
  };
  useEffect(() => {
    if (selectedJobCategory) {
      setJobPostFormData((prevData) => ({
        ...prevData,
        session: `${selectedJobCategory}(${CURRENT_TERM})`,
        compensation: {
          ...prevData.compensation,
          frequency: selectedJobCategory.toLowerCase() === 'full-time' ? 'yearly' : 'monthly',
          type: selectedJobCategory.toLowerCase() === 'full-time' ? 'salary' : 'stipend',
        },
      }));
      setIsFormDisabled(false);
    }
  }, [selectedJobCategory]);

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
    if (!recruiter?.organizationId || !selectedJobCategoryId) {
      alert('Missing required data');
      return;
    }
    const jobPostPayload = {
      ...jobPostFormData,
      jobCategoryId: selectedJobCategoryId,
      organizationId: recruiter.organizationId,
    };
    try {
      setLoading(true);
      setIsFormDisabled(true);
      await createJobPost(jobPostPayload);
      setSelectedJobCategory('');
      setSelectedJobCategoryId(null);
      setJobPostFormData(initialJobPostFormData);
      setActiveStep(0);
      fetchData();
      alert('New job created!');
    } catch (error) {
      console.error(error);
      alert('Failed to create job. Please try again.');
    } finally {
      setLoading(false);
      setIsFormDisabled(false);
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
      {!jobCategories.length && (
        <Typography color="error" variant="subtitle2">
          No job categories available. Please contact job portal admin to create job categories so
          you can create a job post.
        </Typography>
      )}
      <Box
        sx={{
          bgcolor: '#ededed',
          p: 5,
          borderRadius: '20px',
          position: 'relative',
        }}
      >
        {isFormDisabled && (
          <Tooltip
            title={
              !loading && !jobCategories.length && 'No job Categories available to create job.'
            }
            arrow
          >
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(64, 56, 64, 0.2)',
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
          </Tooltip>
        )}
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
              setSelectedJobCategoryId(null);
              setSelectedJobCategory('');
              setIsFormDisabled(true);
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
      <JobList recruiter={recruiter} />
    </Box>
  );
};
const CreateJob = () => {
  return <JpLayoutWithSidebar role="recruiter">{<JobPostPage />}</JpLayoutWithSidebar>;
};

export default CreateJob;
