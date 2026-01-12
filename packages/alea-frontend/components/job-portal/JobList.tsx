import { Delete, Edit } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  createJobPost,
  deleteJobPost,
  getJobPosts,
  JobPostFormData,
  JobPostInfo,
  RecruiterData,
  updateJobPost,
} from '@alea/spec';
import { formatCompensation } from 'packages/alea-frontend/pages/job-portal/search-job';
import {
  validateJobPost,
  ValidationErrors,
} from 'packages/alea-frontend/pages/job-portal/recruiter/create-job';

export const EligibilityForm = ({
  formData,
  handleChange,
  errors,
}: {
  formData: JobPostFormData;
  handleChange: (e: any) => void;
  errors?: ValidationErrors;
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Eligibility
      </Typography>
      <FormControl fullWidth margin="normal" error={!!errors?.qualification}>
        <InputLabel id="qualification-year">Qualification</InputLabel>
        <Select
          labelId="qualification-year"
          label="Qualification"
          name="qualification"
          value={formData.qualification}
          onChange={handleChange}
          sx={{ bgcolor: 'white' }}
        >
          <MenuItem value="Masters">Masters</MenuItem>
          <MenuItem value="Bachelors">Bachelors</MenuItem>
          <MenuItem value="BachelorsAndMasters">Both (Masters+Bachelors)</MenuItem>
        </Select>
        {errors?.qualification && <FormHelperText>{errors.qualification}</FormHelperText>}
      </FormControl>
      <TextField
        label="Target Year"
        fullWidth
        margin="normal"
        name="targetYears"
        error={!!errors?.targetYears}
        helperText={errors?.targetYears}
        value={formData.targetYears}
        onChange={handleChange}
        sx={{ bgcolor: 'white' }}
      />
      <TextField
        type="datetime-local"
        label="Application Deadline"
        fullWidth
        InputLabelProps={{ shrink: true }}
        margin="normal"
        name="applicationDeadline"
        sx={{ bgcolor: 'white' }}
        error={!!errors?.applicationDeadline}
        helperText={errors?.applicationDeadline}
        value={
          formData.applicationDeadline
            ? formData.applicationDeadline.slice(0, 16).replace(' ', 'T')
            : ''
        }
        onChange={(e) => {
          const selectedDate = new Date(e.target.value);
          if (selectedDate < new Date()) {
            alert('Deadline must be in the future.');
            handleChange({ target: { name: 'applicationDeadline', value: '' } });
          } else {
            handleChange(e);
          }
        }}
      />
      <TextField
        label="Number of Intended Offers"
        type="number"
        fullWidth
        margin="normal"
        name="openPositions"
        value={formData.openPositions}
        onChange={handleChange}
        sx={{ bgcolor: 'white' }}
      />
    </Box>
  );
};

export const OfferDetailsForm = ({
  formData,
  handleChange,
  errors,
}: {
  formData: JobPostFormData;
  handleChange: (e: any) => void;
  errors?: ValidationErrors;
}) => {
  const { compensation } = formData;
  const handleCompensationChange = (field: string, value: any) => {
    handleChange({
      target: {
        name: 'compensation',
        value: {
          ...compensation,
          [field]: value,
        },
      },
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Compensation
      </Typography>

      <RadioGroup
        row
        value={compensation.mode}
        onChange={(e) => handleCompensationChange('mode', e.target.value)}
      >
        <FormControlLabel value="fixed" control={<Radio />} label="Fixed amount" />
        <FormControlLabel value="range" control={<Radio />} label="Range" />
      </RadioGroup>

      <Box display="flex" mt={2} gap={2} flexWrap="wrap" alignItems="center">
        {compensation.mode === 'fixed' ? (
          <TextField
            label="Amount"
            type="number"
            value={compensation.fixedAmount ?? ''}
            onChange={(e) => handleCompensationChange('fixedAmount', Number(e.target.value))}
            error={!!errors?.compensation}
            sx={{ bgcolor: 'white', flex: 1, minWidth: 160 }}
          />
        ) : (
          <>
            <TextField
              label="Min"
              type="number"
              value={compensation.minAmount ?? ''}
              onChange={(e) => handleCompensationChange('minAmount', Number(e.target.value))}
              error={!!errors?.compensation}
              sx={{ bgcolor: 'white', flex: 1, minWidth: 160 }}
            />

            <TextField
              label="Max"
              type="number"
              value={compensation.maxAmount ?? ''}
              onChange={(e) => handleCompensationChange('maxAmount', Number(e.target.value))}
              error={!!errors?.compensation}
              sx={{ bgcolor: 'white', flex: 1, minWidth: 160 }}
            />
          </>
        )}

        <FormControl sx={{ flex: 1, minWidth: 140 }} error={!!errors?.compensation}>
          <InputLabel>Currency</InputLabel>
          <Select
            value={compensation.currency}
            label="Currency"
            onChange={(e) => handleCompensationChange('currency', e.target.value)}
            sx={{ bgcolor: 'white' }}
            MenuProps={{ disablePortal: true }}
          >
            <MenuItem value="EUR">EUR</MenuItem>
            <MenuItem value="USD">USD</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ flex: 1, minWidth: 160 }} error={!!errors?.compensation}>
          <InputLabel>Frequency</InputLabel>
          <Select
            value={compensation.frequency}
            label="Frequency"
            onChange={(e) => handleCompensationChange('frequency', e.target.value)}
            sx={{ bgcolor: 'white' }}
            MenuProps={{ disablePortal: true }}
          >
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="yearly">Yearly</MenuItem>
          </Select>
        </FormControl>
      </Box>
      {errors?.compensation ? (
        <Typography variant="body2" color="error" mt={1}>
          {errors.compensation}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary" mt={2}>
          {formatCompensation(compensation)}
        </Typography>
      )}
      <TextField
        label="Facilities / Perks"
        fullWidth
        margin="normal"
        name="facilities"
        value={formData.facilities ?? ''}
        onChange={handleChange}
        multiline
        rows={3}
        sx={{ bgcolor: 'white', mt: 3 }}
        placeholder="Health insurance, relocation support, meals..."
      />
    </Box>
  );
};

export const JobDescriptionsForm = ({
  formData,
  handleChange,
  errors,
}: {
  formData: JobPostFormData;
  handleChange: (e: any) => void;
  errors?: ValidationErrors;
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Job Descriptions
      </Typography>
      <TextField
        label="Session"
        fullWidth
        margin="normal"
        name="session"
        value={formData.session}
        onChange={handleChange}
        disabled
        sx={{
          bgcolor: 'white',
        }}
      />
      <TextField
        label="Job Title"
        required
        error={!!errors?.jobTitle}
        helperText={errors?.jobTitle}
        fullWidth
        margin="normal"
        name="jobTitle"
        value={formData.jobTitle}
        onChange={handleChange}
        sx={{
          bgcolor: 'white',
        }}
      />
      <TextField
        label="Location "
        fullWidth
        margin="normal"
        name="workLocation"
        value={formData.workLocation}
        onChange={handleChange}
        sx={{
          bgcolor: 'white',
        }}
      />
      <FormControl fullWidth margin="normal" error={!!errors?.workMode}>
        <InputLabel id="workMode-label">Work Mode</InputLabel>
        <Select
          labelId="workMode-label"
          label="Work Mode"
          name="workMode"
          value={formData.workMode}
          onChange={handleChange}
          sx={{ bgcolor: 'white' }}
          MenuProps={{ disablePortal: true }}
        >
          <MenuItem value="hybrid">Hybrid</MenuItem>
          <MenuItem value="onsite">Onsite</MenuItem>
          <MenuItem value="remote">Remote</MenuItem>
        </Select>
        {errors?.workMode && <FormHelperText>{errors.workMode}</FormHelperText>}
      </FormControl>
      <TextField
        label="Job Description"
        fullWidth
        margin="normal"
        name="jobDescription"
        value={formData.jobDescription}
        onChange={handleChange}
        multiline
        rows={4}
        sx={{
          bgcolor: 'white',
        }}
        placeholder="Enter the job description here..."
      />
    </Box>
  );
};

export const EditJobPostDialog = ({
  open,
  handleClose,
  jobData,
  handleSave,
}: {
  open: boolean;
  handleClose: () => void;
  jobData: JobPostInfo | null;
  handleSave: (updatedJob: JobPostInfo) => Promise<void>;
}) => {
  const [formData, setFormData] = useState<JobPostInfo | null>(jobData);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  useEffect(() => {
    if (!jobData) return;
    setFormData(jobData);
  }, [jobData]);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : prev));
    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  };

  const handleSubmit = async () => {
    if (!formData) return;

    const validationErrors = validateJobPost(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    await handleSave(formData);
    handleClose();
  };

  if (!formData) return null;
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      scroll="paper"
      sx={{
        '& .MuiDialog-paper': {
          maxHeight: '90vh',
          p: { xs: 2, sm: 4 },
        },
      }}
    >
      <DialogTitle>Edit Job Post</DialogTitle>
      <DialogContent dividers>
        <JobDescriptionsForm formData={formData} handleChange={handleChange} errors={errors} />
        <OfferDetailsForm formData={formData} handleChange={handleChange} errors={errors} />
        <EligibilityForm formData={formData} handleChange={handleChange} errors={errors} />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const JobList = ({ recruiter }: { recruiter: RecruiterData }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPostInfo>(null);
  const [jobPosts, setJobPosts] = useState<JobPostInfo[]>([]);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      const jobs = await getJobPosts(recruiter?.organizationId).catch(() => []);
      setJobPosts(jobs || []);
      setLoading(false);
    };
    if (recruiter?.organizationId) {
      fetchJobs();
    }
  }, [recruiter]);

  const handleEdit = (job: JobPostInfo) => {
    setSelectedJob(job);
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
    setSelectedJob(null);
  };

  const handleSave = async (updatedJob) => {
    setLoading(true);

    try {
      if (selectedJob) {
        await updateJobPost(updatedJob);
      } else {
        await createJobPost(updatedJob);
      }

      const jobs = await getJobPosts(recruiter.organizationId);
      setJobPosts(jobs);
    } catch (error) {
      console.error('Error saving job:', error);
    } finally {
      setLoading(false);
    }
  };
  const filteredJobs = showOnlyMine
    ? jobPosts.filter((job) => job.createdByUserId === recruiter.userId)
    : jobPosts;
  if (loading) {
    return <CircularProgress sx={{ mt: 10 }} />;
  }
  return (
    <Box py={4}>
      <Typography variant="h4" mb={4}>
        Your Org Job Postings
      </Typography>
      <Box sx={{ display: 'flex' }}>
        <FormControlLabel
          sx={{
            ml: 'auto',
            '& .MuiFormControlLabel-label': {
              fontSize: '0.85rem',
              color: 'text.secondary',
            },
          }}
          control={
            <Switch
              checked={showOnlyMine}
              onChange={(e) => setShowOnlyMine(e.target.checked)}
              color="primary"
              size="small"
            />
          }
          label="Show only my job posts"
        />
      </Box>
      {loading ? (
        <CircularProgress sx={{ mt: 10 }} />
      ) : filteredJobs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            {showOnlyMine
              ? "You haven't created any jobs yet."
              : 'No jobs created yet. Start by creating one!'}
          </Typography>
        </Box>
      ) : (
        <List sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, p: 2 }}>
          {filteredJobs.map((job) => (
            <ListItem
              key={job.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #eee',
                py: 2,
                '&:last-child': { borderBottom: 'none' },
              }}
            >
              <ListItemText
                primary={
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    {job.jobTitle}
                  </Typography>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Location: {job.workLocation}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Created By: {job.createdByUserId} |{' '}
                      {new Date(job.createdAt).toLocaleDateString()}
                    </Typography>

                    <Typography variant="body2" color="error">
                      Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
                    </Typography>
                  </Box>
                }
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <IconButton color="primary" onClick={() => handleEdit(job)}>
                  <Edit />
                </IconButton>
                <IconButton
                  color="error"
                  onClick={async () => {
                    const confirmed = window.confirm(
                      `Are you sure you want to delete the job "${job.jobTitle}"?`
                    );
                    if (!confirmed) return;
                    try {
                      setLoading(true);
                      await deleteJobPost(job.id);
                      setJobPosts((prev) => prev.filter((j) => j.id !== job.id));
                    } catch (err) {
                      console.error('Failed to delete job:', err);
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <Delete />
                </IconButton>
                {/* //TODO add badge showing */}
                {/* <IconButton>
                    <Badge badgeContent={job.applicantCount} color="error">
                      <Group />
                    </Badge>
                  </IconButton> */}
              </Box>
            </ListItem>
          ))}
        </List>
      )}
      <EditJobPostDialog
        open={openDialog}
        handleClose={handleClose}
        jobData={selectedJob}
        handleSave={handleSave}
      />
    </Box>
  );
};
