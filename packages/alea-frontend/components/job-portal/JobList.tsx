import { Edit } from '@mui/icons-material';
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
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { createJobPost, getJobPosts, JobPostInfo, RecruiterData, updateJobPost } from '@alea/spec';
import { useEffect, useState } from 'react';
import { JobPostFormData } from 'packages/alea-frontend/pages/job-portal/recruiter/create-job';

export const EligibilityForm = ({
  formData,
  handleChange,
}: {
  formData: JobPostFormData;
  handleChange: (e: any) => void;
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Eligibility
      </Typography>
      <FormControl fullWidth margin="normal">
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
      </FormControl>
      <TextField
        label="Target Year"
        fullWidth
        margin="normal"
        name="targetYears"
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
}: {
  formData: JobPostFormData;
  handleChange: (e: any) => void;
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Offer Details
      </Typography>
      <FormControl fullWidth margin="normal">
        <InputLabel id="currency">Currency</InputLabel>
        <Select
          labelId="currency"
          label="currency"
          name="currency"
          value={formData.currency}
          //   onChange={(e) => handleChange({ target: { name: 'currency', value: e.target.value } })}
          onChange={handleChange}
          sx={{ bgcolor: 'white' }}
          MenuProps={{ disablePortal: true }}
        >
          <MenuItem value="Euro per month">EURO per month</MenuItem>
          <MenuItem value="USD per month">USD per month</MenuItem>
        </Select>
      </FormControl>
      <TextField
        label="Stipend"
        fullWidth
        margin="normal"
        name="stipend"
        value={formData.stipend}
        onChange={handleChange}
        sx={{ bgcolor: 'white' }}
      />
      <TextField
        label="Other Facilities"
        fullWidth
        margin="normal"
        name="facilities"
        value={formData.facilities}
        onChange={handleChange}
        multiline
        rows={4}
        sx={{ bgcolor: 'white' }}
      />
    </Box>
  );
};

export const JobDescriptionsForm = ({
  formData,
  handleChange,
}: {
  formData: JobPostFormData;
  handleChange: (e: any) => void;
}) => {
  console.log({ formData });
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
      <FormControl fullWidth margin="normal">
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

export const JobPostDialog = ({
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
  const [formData, setFormData] = useState<JobPostInfo>(jobData);
  useEffect(() => {
    if (!jobData) return;
    setFormData(jobData);
  }, [jobData]);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    handleSave(formData);
    handleClose();
  };
  if (!jobData) return;
  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md" sx={{ zIndex: 2004, p: 20 }}>
      <DialogTitle>{'Edit Job Post'}</DialogTitle>
      <DialogContent>
        <JobDescriptionsForm formData={formData} handleChange={handleChange} />
        <OfferDetailsForm formData={formData} handleChange={handleChange} />
        <EligibilityForm formData={formData} handleChange={handleChange} />
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
      <JobPostDialog
        open={openDialog}
        handleClose={handleClose}
        jobData={selectedJob}
        handleSave={handleSave}
      />
    </Box>
  );
};
