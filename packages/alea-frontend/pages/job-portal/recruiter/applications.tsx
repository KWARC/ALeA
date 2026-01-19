import {
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  ApplicationWithProfile,
  canAccessResource,
  getJobApplicationsByJobPost,
  getJobPosts,
  getRecruiterProfile,
  getStudentProfileUsingUserId,
  JobPostInfo,
  RecruiterData,
} from '@alea/spec';
import { Action, PRIMARY_COL, ResourceName } from '@alea/utils';
import { ApplicationTable } from '../../../components/job-portal/ApplicationsTable';
import JpLayoutWithSidebar from '../../../layouts/JpLayoutWithSidebar';

const StatusFilter = ({
  applications,
  setFilteredApplications,
}: {
  applications: ApplicationWithProfile[];
  setFilteredApplications: React.Dispatch<React.SetStateAction<ApplicationWithProfile[]>>;
}) => {
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    if (filterStatus) {
      setFilteredApplications(
        applications.filter((application) => application.applicationStatus === filterStatus)
      );
    } else {
      setFilteredApplications(applications);
    }
  }, [applications, filterStatus]);

  return (
    <FormControl
      sx={{ flex: '1 1 200px', maxWidth: { md: '200px' }, boxShadow: 2, borderRadius: 2 }}
    >
      <InputLabel shrink>Filter by Status</InputLabel>
      <Select
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
        displayEmpty
        label="Filter by Status"
        labelId="Filter by Status"
        sx={{
          backgroundColor: 'white',
          '& .MuiSelect-select': {
            padding: '10px',
          },
        }}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="APPLIED">Pending</MenuItem>
        <MenuItem value="SHORTLISTED_FOR_INTERVIEW">Shortlisted</MenuItem>
        <MenuItem value="REJECTED">Rejected</MenuItem>
        <MenuItem value="ON_HOLD">On Hold</MenuItem>
        <MenuItem value="OFFERED">Offered</MenuItem>
        <MenuItem value="OFFER_ACCEPTED">Offer Accepted</MenuItem>
        <MenuItem value="OFFER_REJECTED">Offer Rejected</MenuItem>
      </Select>
    </FormControl>
  );
};

export const JobSelect = ({
  setLoading,
  setApplications,
  jobPosts,
}: {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setApplications: React.Dispatch<React.SetStateAction<ApplicationWithProfile[]>>;
  jobPosts: JobPostInfo[];
}) => {
  const [selectedJob, setSelectedJob] = useState<JobPostInfo | null>(
    jobPosts.length > 0 ? jobPosts[0] : null
  );
  async function getApplications(job: JobPostInfo) {
    if (!job) return;
    setLoading(true);
    try {
      const applications = await getJobApplicationsByJobPost(job?.id);
      const applicationsWithJobTitle = applications.map((application) => ({
        ...application,
        jobTitle: job?.jobTitle,
      }));
      const applicationsWithProfile = await Promise.all(
        applicationsWithJobTitle.map(async (application) => {
          const studentProfile = await getStudentProfileUsingUserId(application.applicantId);
          return { ...application, studentProfile };
        })
      );
      setApplications(applicationsWithProfile);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedJob) {
      getApplications(selectedJob);
    } else {
      setApplications([]);
    }
  }, [selectedJob]);

  return (
    <FormControl
      sx={{ flex: '1 1 200px', maxWidth: { md: '350px' }, boxShadow: 2, borderRadius: 2 }}
    >
      <InputLabel shrink>Select a job posting</InputLabel>
      <Select
        labelId="Select a job Posting"
        label="Select a job Posting"
        value={selectedJob?.id || ''}
        onChange={(e) => {
          const selectedJob = jobPosts?.find((job) => job.id === e.target.value) || null;
          setSelectedJob(selectedJob);
        }}
        displayEmpty
        fullWidth
        sx={{
          backgroundColor: 'white',
          '& .MuiSelect-select': {
            padding: '10px',
          },
        }}
      >
        <MenuItem value="" disabled>
          Select a Job Post
        </MenuItem>
        {jobPosts?.map((job) => (
          <MenuItem key={job.id} value={job.id}>
            {job.jobTitle}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

const Applications = () => {
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);
  const [filteredApplications, setFilteredApplications] = useState(applications);
  const [jobPosts, setJobPosts] = useState<JobPostInfo[]>([]);
  const [accessCheckLoading, setAccessCheckLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setAccessCheckLoading(true);
      let recruiterData: RecruiterData;
      try {
        recruiterData = await getRecruiterProfile();
        if (!recruiterData) {
          router.push('/job-portal');
          return;
        }
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
        console.error('Error fetching recruiter profile or checking access:', error);
        router.push('/job-portal');
        return;
      }
      const jobPosts = await getJobPosts(recruiterData.organizationId);
      setJobPosts(jobPosts || []);
      setAccessCheckLoading(false);
    };
    fetchData();
  }, []);

  if (accessCheckLoading) return <CircularProgress />;
  return (
    <Box sx={{ maxWidth: '1200px', margin: 'auto', p: { xs: '30px 16px', md: '30px' } }}>
      <Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom color={PRIMARY_COL}>
          Job Applications
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <JobSelect
            setLoading={setLoading}
            setApplications={setApplications}
            jobPosts={jobPosts}
          />
          <StatusFilter
            applications={applications}
            setFilteredApplications={setFilteredApplications}
          />
        </Box>
        <hr />
        <ApplicationTable
          loading={loading}
          filteredApplications={filteredApplications}
          setFilteredApplications={setFilteredApplications}
        />
      </Box>
    </Box>
  );
};

const JobApplicationsPage = () => {
  return (
    <JpLayoutWithSidebar
      role="recruiter"
      title="Applications | Job Portal - ALeA"
      description="Review and manage student job applications in the ALeA Job Portal"
    >
      {<Applications />}
    </JpLayoutWithSidebar>
  );
};

export default JobApplicationsPage;
