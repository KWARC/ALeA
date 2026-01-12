import { Delete, Edit, Save } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Modal,
  Paper,
  Select,
  SelectChangeEvent,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  canAccessResource,
  createJobCategory,
  getJobCategories,
  JobCategoryInfo,
} from '@alea/spec';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import MainLayout from '../../../layouts/MainLayout';
export const getExactDuration = (
  startDate?: string,
  endDate?: string
): string => {
  if (!startDate || !endDate) return '';
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) return '';
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  return parts.join(', ') || '0 days';
};

export function JobCategoryDetails({
  jobCategories,
  renderActions,
}: {
  jobCategories: JobCategoryInfo[];
  renderActions: (jobCategory: JobCategoryInfo) => React.JSX.Element;
}) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Job Category</TableCell>
            <TableCell>Start Date</TableCell>
            <TableCell>End Date</TableCell>
            <TableCell>Internship Period</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobCategories?.length > 0 ? (
            jobCategories.map((jobCategoryItem, index) => (
              <TableRow key={index}>
                <TableCell>{jobCategoryItem.jobCategory}</TableCell>
                <TableCell>
                  {jobCategoryItem.startDate
                    ? new Date(jobCategoryItem.startDate).toLocaleDateString('en-GB')
                    : 'N/A'}
                </TableCell>
                <TableCell>
                  {jobCategoryItem.endDate
                    ? new Date(jobCategoryItem.endDate).toLocaleDateString('en-GB')
                    : 'N/A'}
                </TableCell>
                <TableCell>{jobCategoryItem.internshipPeriod || 'N/A'}</TableCell>
                {renderActions && (
                  <TableCell align="center">{renderActions(jobCategoryItem)}</TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} align="center">
                No jobCategories created yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [jobCategories, setJobs] = useState<JobCategoryInfo[]>([]);
  const [accessCheckLoading, setAccessCheckLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editJob, setEditJob] = useState<JobCategoryInfo>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const instanceId = CURRENT_TERM;

  const router = useRouter();
  useEffect(() => {
    const checkAccess = async () => {
      setAccessCheckLoading(true);
      const hasAccess = await canAccessResource(ResourceName.JOB_PORTAL, Action.MANAGE_JOB_TYPES, {
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

  const fetchJobCategoryData: () => Promise<void> = async () => {
    try {
      setLoading(true);
      const res = await getJobCategories(instanceId);
      setJobs(res);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessCheckLoading) return;
    fetchJobCategoryData();
  }, [accessCheckLoading]);

  const renderActions = (job) => (
    <>
      <IconButton onClick={() => handleEdit(job)} color="primary">
        <Edit />
      </IconButton>
      <IconButton onClick={() => deleteJob(job.id)} color="error">
        <Delete />
      </IconButton>
    </>
  );

  const handleTabChange = (event, newValue) => setActiveTab(newValue);
  const handleUpdationoJobCategoryChange = (
    event: SelectChangeEvent<'Full-Time' | 'Internship'>
  ) => {
    setEditJob((prev) => ({
      ...prev,
      jobCategory: event.target.value,
    }));
  };

  const handleUpdationDateChange = (type: 'start' | 'end', value: string) => {
    setEditJob((prev) => {
      const updatedStartDate = type === 'start' ? value : prev.startDate;
      const updatedEndDate = type === 'end' ? value : prev.endDate;
      return {
        ...prev,
        startDate: updatedStartDate,
        endDate: updatedEndDate,
        internshipPeriod: getExactDuration(updatedStartDate, updatedEndDate),
      };
    });
  };

  const handleEdit = (job: JobCategoryInfo) => {
    const formattedEditJob = {
      ...job,
      startDate: job.startDate ? dayjs(job.startDate).format('YYYY-MM-DD') : null,
      endDate: job.endDate ? dayjs(job.endDate).format('YYYY-MM-DD') : null,
    };
    setEditJob(formattedEditJob);
    setModalOpen(true);
  };

  const updateJob = async () => {
    try {
      const formattedEditJob = {
        ...editJob,
        startDate: editJob.startDate ? dayjs(editJob.startDate).format('YYYY-MM-DD') : null,
        endDate: editJob.endDate ? dayjs(editJob.endDate).format('YYYY-MM-DD') : null,
      };
      if (
        formattedEditJob.jobCategory === 'Full-Time' ||
        formattedEditJob.jobCategory === 'full-name'
      ) {
        formattedEditJob.endDate = null;
        formattedEditJob.internshipPeriod = null;
      }
      // const response = await updateJobCategory(formattedEditJob);   dont delete it
      setSnackbarOpen(true);
      setJobs((prevJobs) =>
        prevJobs.map((job) => (job.id === editJob.id ? { ...job, ...formattedEditJob } : job))
      );

      setModalOpen(false);
    } catch (error) {
      console.error('Error details:', error);
    }
  };

  const deleteJob = async (id: number) => {
    if (id) {
      try {
        // const response = await deleteJobCategory(id);    dont deletee it
        setJobs((prevJobs) => prevJobs.filter((job) => job.id !== id));

        setSnackbarOpen(true);
      } catch (error) {
        console.error('error occured in deleting');
      }
    }
  };

  if (accessCheckLoading || loading) return <CircularProgress color="primary" />;

  return (
    <MainLayout title="Admin Dashboard | Job Portal">
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
          Admin Dashboard
        </Typography>
        <Typography variant="subtitle1">Create a job according to session</Typography>
      </Box>

      <Box sx={{ maxWidth: '960px', mx: 'auto', px: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          centered
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="Job Categorys" />
          <Tab label="Programmes & Courses" />
          <Tab label="Recruiter Org" />
        </Tabs>

        <Divider sx={{ mt: 2, mb: 4 }} />

        {activeTab === 0 && (
          <>
            <JobCategoryForm onSave={fetchJobCategoryData} />
            <Box>
              <Typography variant="h6" gutterBottom>
                Created Job Categorys
              </Typography>
              <JobCategoryDetails jobCategories={jobCategories} renderActions={renderActions} />
            </Box>
          </>
        )}
      </Box>
      <JobEditModal
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        editJob={editJob}
        handleUpdationoJobCategoryChange={handleUpdationoJobCategoryChange}
        handleUpdationDateChange={handleUpdationDateChange}
        updateJob={updateJob}
      />
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert severity="success" onClose={() => setSnackbarOpen(false)}>
          Operation Successful!
        </Alert>
      </Snackbar>
    </MainLayout>
  );
};

export default AdminDashboard;

const JobCategoryForm = ({ onSave }: { onSave: () => Promise<void> }) => {
  const [jobCategory, setJobCategory] = useState<'Full-Time' | 'Internship'>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const [internshipPeriod, setInternshipPeriod] = useState<string>(null);

  const handleJobCategoryChange = (event) => {
    setJobCategory(event.target.value);
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    let updatedStartDate = startDate;
    let updatedEndDate = endDate;
    if (type === 'start') {
      updatedStartDate = value;
      setStartDate(value);
    } else {
      updatedEndDate = value;
      setEndDate(value);
    }
    const duration = getExactDuration(updatedStartDate, updatedEndDate);
    setInternshipPeriod(duration);
  };
  
  const handleSubmit = async () => {
    const newJobCategory = {
      jobCategory,
      startDate,
      endDate,
      internshipPeriod,
      instanceId: CURRENT_TERM,
    };

    try {
      await createJobCategory(newJobCategory);
      onSave();
      setJobCategory(null);
      setStartDate(null);
      setEndDate(null);
      setInternshipPeriod(null);
    } catch (error) {
      console.error('Error creating job category:', error);
    }
  };

  return (
    <Card sx={{ boxShadow: 3, mb: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Create Job Category
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Fill in the details to create a new job category.
        </Typography>

        <Grid container spacing={3} mt={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Job Category</InputLabel>
              <Select value={jobCategory} onChange={handleJobCategoryChange} label="Job Category">
                <MenuItem value="Internship">Internship</MenuItem>
                <MenuItem value="Full-Time">Full-Time</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={startDate || ''}
              onChange={(e) => handleDateChange('start', e.target.value)}
            />
          </Grid>
          {jobCategory === 'Internship' && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={endDate || ''}
                  onChange={(e) => handleDateChange('end', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Internship Period"
                  value={internshipPeriod || ''}
                  InputProps={{
                    readOnly: true,
                  }}
                  variant="outlined"
                />
              </Grid>
            </>
          )}
        </Grid>

        <Box mt={3} textAlign="center">
          <Tooltip title="Save job details" arrow>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Save />}
              onClick={handleSubmit}
              size="large"
            >
              Create Job Category
            </Button>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
};

const JobEditModal = ({
  modalOpen,
  setModalOpen,
  editJob,
  handleUpdationoJobCategoryChange,
  handleUpdationDateChange,
  updateJob,
}: {
  modalOpen: boolean;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editJob: JobCategoryInfo;
  handleUpdationoJobCategoryChange: (event: SelectChangeEvent<'Full-Time' | 'Internship'>) => void;
  handleUpdationDateChange: (type: string, value: string) => void;
  updateJob: () => void;
}) => {
  return (
    <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
      <Box
        sx={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          zIndex: 2,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Edit Job
        </Typography>
        <FormControl fullWidth>
          <InputLabel>Job Category</InputLabel>
          <Select
            value={
              editJob?.jobCategory === 'full-time' || editJob?.jobCategory === 'Full-Time'
                ? 'Full-Time'
                : 'Internship'
            }
            onChange={handleUpdationoJobCategoryChange}
            variant="outlined"
            label="Job Category"
          >
            <MenuItem value="Internship">Internship</MenuItem>
            <MenuItem value="Full-Time">Full-Time</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Start Date"
          name="startDate"
          type="date"
          value={editJob?.startDate}
          onChange={(e) => handleUpdationDateChange('start', e.target.value)}
          fullWidth
          margin="normal"
          InputLabelProps={{
            shrink: true,
          }}
        />
        {!(editJob?.jobCategory === 'full-time' || editJob?.jobCategory === 'Full-Time') && (
          <>
            <TextField
              label="End Date"
              name="endDate"
              type="date"
              value={editJob?.endDate}
              onChange={(e) => handleUpdationDateChange('end', e.target.value)}
              fullWidth
              margin="normal"
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              fullWidth
              label="Internship Period"
              name="internshipPeriod"
              value={editJob?.internshipPeriod || ''}
              InputProps={{
                readOnly: true,
              }}
              variant="outlined"
              margin="normal"
            />
          </>
        )}
        <Box sx={{ display: 'flex', gap: 3, mt: 3 }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setModalOpen(false)}
            fullWidth
          >
            Cancel
          </Button>
          <Button onClick={updateJob} variant="contained" color="primary" fullWidth>
            Save Changes
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};
