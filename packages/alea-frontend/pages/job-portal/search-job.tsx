import {
  BusinessOutlined,
  FilterAlt,
  HomeWorkOutlined,
  InfoOutlined,
  Search,
  SyncAltOutlined,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Fade,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Modal,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import {
  canAccessResource,
  CompensationInfo,
  createJobApplication,
  getAllJobPosts,
  getJobApplicationsByUserId,
  getOrganizationProfile,
  getUserInfo,
  JobPostInfo,
  OrganizationData,
} from '@alea/spec';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import JpLayoutWithSidebar from '../../layouts/JpLayoutWithSidebar';

const JobDetailsModal = ({ open, onClose, selectedJob }) => {
  return (
    <Modal open={open} onClose={onClose} closeAfterTransition sx={{ zIndex: 2005 }}>
      <Fade in={open}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 600,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 24,
            p: 3,
          }}
        >
          {selectedJob ? (
            <>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
                {selectedJob.jobTitle}
              </Typography>

              <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                <strong>Company:</strong> {selectedJob.organization.companyName}
              </Typography>

              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Website:</strong>{' '}
                <a
                  href={selectedJob.organization.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {selectedJob.organization.website}
                </a>
              </Typography>

              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Work Mode:</strong> {selectedJob.workMode}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Location:</strong> 📍 {selectedJob.workLocation}
              </Typography>

              <Typography variant="body2" sx={{ mb: 2 }}>
                {formatCompensation(selectedJob.compensation)}{' '}
              </Typography>

              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Application Deadline:</strong> ⏳{' '}
                {new Date(selectedJob.applicationDeadline).toLocaleDateString()}
              </Typography>

              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Open Positions:</strong> {selectedJob.openPositions}
              </Typography>

              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Qualification Required:</strong> {selectedJob.qualification}
              </Typography>

              <Typography variant="body2" sx={{ mb: 3 }}>
                <strong>Target Years:</strong> {selectedJob.targetYears}
              </Typography>

              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Description:</strong> {selectedJob.jobDescription}
              </Typography>

              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Facilities:</strong> {selectedJob.facilities}
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={onClose}
                  sx={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold' }}
                >
                  Close
                </Button>
              </Box>
            </>
          ) : (
            <CircularProgress />
          )}
        </Box>
      </Fade>
    </Modal>
  );
};
export const OrganizationModal = ({
  open,
  onClose,
  organization,
}: {
  open: boolean;
  onClose: () => void;
  organization: OrganizationData | null;
}) => {
  return (
    <Modal open={open} onClose={onClose} closeAfterTransition>
      <Fade in={open}>
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
          {organization ? (
            <>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {organization.companyName}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Incorporation Year: {organization.incorporationYear || 'N/A'}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Startup: {organization.isStartup ? 'Yes' : 'No'}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                About: {organization.about || 'N/A'}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Website:{' '}
                {organization.website ? (
                  <a href={organization.website} target="_blank" rel="noopener noreferrer">
                    {organization.website}
                  </a>
                ) : (
                  'N/A'
                )}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Company Type: {organization.companyType || 'N/A'}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Address: {organization.officeAddress || 'N/A'}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Postal Code: {organization.officePostalCode || 'N/A'}
              </Typography>

              <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={onClose}>
                Close
              </Button>
            </>
          ) : (
            <Typography>No organization data available.</Typography>
          )}
        </Box>
      </Fade>
    </Modal>
  );
};
export function formatCompensation(c?: CompensationInfo): string | null {
  if (!c) return null;
  const typeText = c.type === 'salary' ? 'Salary' : 'Stipend';
  const freqText =
    c.frequency === 'yearly' ? 'per year' : c.frequency === 'monthly' ? 'per month' : c.frequency;
  if (c.mode === 'fixed' && c.fixedAmount != null) {
    return `${typeText}: ${c.currency} ${c.fixedAmount.toLocaleString()} ${freqText}`;
  }
  if (c.mode === 'range') {
    const minText = c.minAmount != null ? c.minAmount.toLocaleString() : '';
    const maxText = c.maxAmount != null ? c.maxAmount.toLocaleString() : '';
    let rangeText = '';
    if (minText && maxText) rangeText = `${c.currency}${minText} – ${c.currency}${maxText}`;
    else if (minText) rangeText = `${c.currency}${minText}`;
    else if (maxText) rangeText = `${c.currency}${maxText}`;
    if (!rangeText) return null;
    return `${typeText}:  ${rangeText} ${freqText}`;
  }
  return null;
}

export const JobBox = ({ job, onApply, onReadMore }) => {
  const [openOrgModal, setOpenOrgModal] = useState(false);
  const getIcon = () => {
    if (job.workMode === 'remote')
      return <HomeWorkOutlined sx={{ color: 'white', fontSize: 18 }} />;
    if (job.workMode === 'hybrid') return <SyncAltOutlined sx={{ color: 'white', fontSize: 18 }} />;
    return <BusinessOutlined sx={{ color: 'white', fontSize: 18 }} />;
  };

  const getBgColor = () => {
    if (job.workMode === 'remote') return 'success.light';
    if (job.workMode === 'hybrid') return 'warning.light';
    return 'primary.light';
  };

  return (
    <>
      <Box
        sx={{
          borderRadius: 2,
          boxShadow: 3,
          position: 'relative',
          overflow: 'hidden',
          p: 2,
          minHeight: 280,
          bgcolor: 'white',
        }}
      >
        {/* 
            //TODO: add logo
        <img
        src={job.logo}
        alt={job.organization.companyName}
        style={{ width: 50, height: 50, position: 'absolute', top: 10, right: 10 }}
      /> */}

        <Typography variant="h6" mb={1}>
          {job.jobTitle}
        </Typography>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography
            variant="body1"
            color="textSecondary"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            {job.organization.companyName}
            <IconButton sx={{ ml: 1 }} onClick={() => setOpenOrgModal(true)}>
              <InfoOutlined color="primary" />
            </IconButton>
          </Typography>

          <Chip
            label={job.workMode}
            icon={getIcon()}
            sx={{
              textTransform: 'capitalize',
              bgcolor: getBgColor(),
              color: 'white',
              fontWeight: 'bold',
              px: 1.5,
              '& .MuiChip-icon': { color: 'white' },
            }}
          />
        </Box>

        <Typography variant="body2" gutterBottom>
          💰 {formatCompensation(job.compensation)}
        </Typography>

        <Typography variant="body2" gutterBottom>
          📍 {job.workLocation}
        </Typography>

        <Typography variant="body2">
          ⏳ Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
        </Typography>

        <Box mt={2}>
          <Button
            variant="contained"
            fullWidth
            sx={{ mb: 1 }}
            disabled={job.alreadyApplied}
            onClick={() => onApply(job.id)}
          >
            {job.alreadyApplied ? 'Applied' : 'Apply'}
          </Button>
          <Button variant="outlined" fullWidth onClick={() => onReadMore(job)}>
            Read More
          </Button>
        </Box>
      </Box>
      <OrganizationModal
        open={openOrgModal}
        onClose={() => setOpenOrgModal(false)}
        organization={job.organization}
      />
    </>
  );
};

export function SearchJob() {
  const [accessCheckLoading, setAccessCheckLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [jobPosts, setJobPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('latestJobPost');
  const [filters, setFilters] = useState({ remote: false, onsite: false, hybrid: false });
  const [selectedJob, setSelectedJob] = useState(null);
  const [openJobModal, setOpenJobModal] = useState(false);
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
    const fetchJobPosts = async () => {
      setLoading(true);
      try {
        const [jobs, applications] = await Promise.all([
          getAllJobPosts(),
          getJobApplicationsByUserId(),
        ]);
        const appliedJobIds = new Set(applications.map((app) => app.jobPostId));
        const enrichedJobPosts = await Promise.all(
          jobs.map(async (job) => {
            const organization = await getOrganizationProfile(job.organizationId);
            return {
              ...job,
              organization,
              alreadyApplied: appliedJobIds.has(job.id),
            };
          })
        );
        setJobPosts(enrichedJobPosts);
      } catch (error) {
        console.error('Error fetching job posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobPosts();
  }, [accessCheckLoading]);

  const handleFilterChange = (e) => {
    const value = e.target.value;
    setFilters({
      remote: false,
      onsite: false,
      hybrid: false,
    });

    if (value === 'remote') {
      setFilters((prev) => ({ ...prev, remote: true }));
    } else if (value === 'onsite') {
      setFilters((prev) => ({ ...prev, onsite: true }));
    } else if (value === 'hybrid') {
      setFilters((prev) => ({ ...prev, hybrid: true }));
    } else {
      setFilters({ remote: false, onsite: false, hybrid: false });
    }
  };

  const handleSearch = () => {
    return jobPosts.filter((job) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        job.jobTitle.toLowerCase().includes(searchLower) ||
        job.organization.companyName.toLowerCase().includes(searchLower)
      );
    });
  };
  const getCompensationValue = (job: JobPostInfo): number => {
    const c = job.compensation;
    if (!c) return 0;
    if (c.mode === 'fixed') {
      return c.fixedAmount ?? 0;
    }
    if (c.mode === 'range') {
      if (c.minAmount != null) return c.minAmount;
      if (c.maxAmount != null) return c.maxAmount;
      return 0;
    }
    return 0;
  };

  const handleSort = (filteredJobs) => {
    if (sortBy === 'salary') {
      return filteredJobs.sort((a, b) => getCompensationValue(b) - getCompensationValue(a));
    } else if (sortBy === 'latestJobPost') {
      return filteredJobs.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sortBy === 'closestDeadline') {
      return filteredJobs.sort(
        (a, b) =>
          new Date(b.applicationDeadline).getTime() - new Date(a.applicationDeadline).getTime()
      );
    }
  };

  const handleReadMore = (job) => {
    setSelectedJob(job);
    setOpenJobModal(true);
  };

  const handleCloseJobModal = () => {
    setOpenJobModal(false);
    setSelectedJob(null);
  };
  const handleApply = async (jobPostId: number) => {
    try {
      const userInfo = await getUserInfo();
      if (!userInfo) return;
      await createJobApplication(jobPostId);
      setJobPosts((prevJobs) =>
        prevJobs.map((job) => (job.id === jobPostId ? { ...job, alreadyApplied: true } : job))
      );
    } catch (error) {
      console.error('Error applying for this job:', error);
    }
  };
  const filteredJobs = handleSearch().filter((job) => {
    const workModeFilter =
      (filters.remote && job.workMode === 'remote') ||
      (filters.onsite && job.workMode === 'onsite') ||
      (filters.hybrid && job.workMode === 'hybrid');
    if (!filters.remote && !filters.onsite && !filters.hybrid) {
      return true;
    }
    return workModeFilter;
  });

  const sortedJobs = handleSort(filteredJobs);

  if (accessCheckLoading) {
    return <CircularProgress color="primary" />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', p: { xs: '30px 16px', md: '30px' } }}>
      <Box sx={{ maxWidth: 'xl', mx: 'auto' }}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            mb: 3,
            px: 3,
            py: 2,
            backgroundColor: '#fff',
            borderRadius: '12px',
            boxShadow: 2,
            flexWrap: 'wrap',
          }}
        >
          <TextField
            label="Search Jobs"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type any job name or company name"
            InputProps={{
              startAdornment: <Search sx={{ color: 'gray', mr: 1 }} />,
            }}
            sx={{
              minWidth: '300px',
              flexGrow: 1,
              borderRadius: '10px',
              backgroundColor: '#f9f9f9',
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
              },
            }}
          />

          <FormControl
            variant="outlined"
            sx={{
              minWidth: 140,
              flexGrow: { xs: '1', sm: 0 },
            }}
          >
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              label="Sort By"
              sx={{
                borderRadius: '10px',
                backgroundColor: '#f9f9f9',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                },
              }}
            >
              <MenuItem value="latestJobPost">Latest</MenuItem>
              <MenuItem value="salary">Highest Salary</MenuItem>
              <MenuItem value="closestDeadline">Closest Deadline</MenuItem>
            </Select>
          </FormControl>

          <FormControl
            variant="outlined"
            sx={{
              minWidth: 140,
              flexGrow: { xs: '1', md: 0 },
            }}
          >
            <InputLabel>Filter Work Mode</InputLabel>
            <Select
              value={
                filters.remote
                  ? 'remote'
                  : filters.onsite
                  ? 'onsite'
                  : filters.hybrid
                  ? 'hybrid'
                  : 'all'
              }
              onChange={handleFilterChange}
              label="Filter Work Mode"
              startAdornment={
                <InputAdornment position="start">
                  <FilterAlt sx={{ color: 'gray' }} />
                </InputAdornment>
              }
              sx={{
                borderRadius: '10px',
                backgroundColor: '#f9f9f9',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                },
              }}
            >
              <MenuItem value="all">All </MenuItem>
              <MenuItem value="remote">Remote</MenuItem>
              <MenuItem value="onsite">Onsite</MenuItem>
              <MenuItem value="hybrid">Hybrid</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '50vh',
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {sortedJobs.length > 0 ? (
              sortedJobs.map((job, index) => (
                <Box
                  key={index}
                  sx={{
                    minWidth: '300px',
                    maxWidth: '600px',
                    flexGrow: 1,
                    flexBasis: 'calc(33.333% - 40px)',
                    mb: 3,
                  }}
                >
                  <JobBox job={job} onApply={handleApply} onReadMore={handleReadMore} />
                </Box>
              ))
            ) : (
              <Typography
                variant="h6"
                sx={{ mt: 2, mx: 'auto', textAlign: 'center', width: '100%' }}
              >
                No jobs found.
              </Typography>
            )}
          </Box>
        )}
      </Box>
      <JobDetailsModal
        open={openJobModal}
        onClose={handleCloseJobModal}
        selectedJob={selectedJob}
      />
    </Box>
  );
}

const JobPage = () => {
  return <JpLayoutWithSidebar role="student">{<SearchJob />}</JpLayoutWithSidebar>;
};

export default JobPage;
