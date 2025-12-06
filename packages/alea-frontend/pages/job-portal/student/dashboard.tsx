import { Box, Button, CircularProgress, Icon, Typography } from '@mui/material';
import {
  canAccessResource,
  getAllJobPosts,
  getJobApplicationsByUserId,
  getStudentProfile,
  JobApplicationInfo,
  JobPostInfo,
  StudentData,
} from '@alea/spec';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';
import { useRouter } from 'next/router';
import JpLayoutWithSidebar from '../../../layouts/JpLayoutWithSidebar';
import { useEffect, useState } from 'react';
import { Add, Assignment, Cancel, Chat, EmojiPeople, SvgIconComponent } from '@mui/icons-material';
import { UserProfileCard } from '../../../components/job-portal/UserProfileCard';
import { JobCard } from '../../../components/job-portal/JobCard';

export const DashboardJobSection = ({
  title,
  jobs,
  fallbackText = 'No jobs available yet',
  maxJobsToShow = 3,
  showAddIcon = true,
  buttonText,
  buttonLink,
  hideJobRedirect = false,
}: {
  title: string;
  jobs: JobPostInfo[];
  fallbackText?: string;
  maxJobsToShow?: number;
  showAddIcon?: boolean;
  buttonText: string;
  buttonLink: string;
  hideJobRedirect?: boolean;
}) => {
  const router = useRouter();
  return (
    <Box
      sx={{
        flex: '2 1 400px',
        p: 3,
        borderRadius: 2,
        boxShadow: 3,
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 350,
        justifyContent: 'space-between',
      }}
    >
      <Box>
        <Typography variant="h6" mb={2}>
          {title}
        </Typography>
        {jobs && jobs.length > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {jobs.slice(0, maxJobsToShow).map((job, index) => (
              <JobCard job={job} key={index} hideJobRedirect={hideJobRedirect} />
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 150,
              color: 'text.secondary',
            }}
          >
            {fallbackText}
          </Box>
        )}
      </Box>

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          startIcon={showAddIcon ? <Add /> : undefined}
          onClick={() => router.push(buttonLink)}
        >
          {buttonText}
        </Button>
      </Box>
    </Box>
  );
};
export const StatsSection = ({
  stats,
  iconComponents,
  colors,
  statusState,
}: {
  stats: {
    key: string;
    label: string;
  }[];
  iconComponents: SvgIconComponent[];
  colors: string[];
  statusState: Record<string, number>;
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        justifyContent: 'center',
      }}
    >
      {stats.map((stat, index) => {
        const IconComponent = iconComponents[index];
        return (
          <Box
            key={stat.key}
            sx={{
              bgcolor: colors[index],
              p: 3,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderRadius: '15px',
              boxShadow: 3,
              flex: '1 1 200px',
            }}
          >
            <Icon
              sx={{
                fontSize: 80,
                mr: 2,
                color: 'white',
                border: '1px solid #fff',
                borderRadius: '15px',
                pb: '20px',
              }}
            >
              <IconComponent sx={{ fontSize: '60px' }} />
            </Icon>
            <Box sx={{ flexGrow: 1 }}>
              <Typography
                variant="h6"
                sx={{ color: '#FFFFFF', fontWeight: '500', fontSize: '1.5rem' }}
              >
                {stat.label}
              </Typography>
              <Typography variant="h3" sx={{ color: '#FFFFFF', fontWeight: '600' }}>
                {statusState[stat.key] ?? 0}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
export function StudentDashboard() {
  const [accessCheckLoading, setAccessCheckLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentData>(null);
  const [statusState, setStatusState] = useState<{
    applied: number;
    offerReceived: number;
    rejected: number;
  }>({
    applied: 0,
    offerReceived: 0,
    rejected: 0,
  });
  const [allJobPosts, setAllJobPosts] = useState<JobPostInfo[]>([]);
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
        setStudent(res);
        const applications = await getJobApplicationsByUserId();
        const statusState = transformApplicationData(applications);
        setStatusState(statusState);
        const jobPosts = await getAllJobPosts();
        setAllJobPosts(jobPosts);
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, [accessCheckLoading]);

  const transformApplicationData = (applicationData: JobApplicationInfo[]) => {
    const statusStats = {
      applied: 0,
      offerReceived: 0,
      rejected: 0,
    };
    applicationData?.forEach((application) => {
      const { applicationStatus } = application;
      statusStats.applied += 1;
      if (applicationStatus === 'REJECTED') {
        statusStats.rejected += 1;
      }
    });
    statusStats.offerReceived = statusStats.applied - statusStats.rejected;
    return statusStats;
  };

  const stats = [
    //TODO , later on will add Interviews
    { key: 'offerReceived', label: 'Offer Received' },
    { key: 'applied', label: 'Applied' },
    { key: 'rejected', label: 'Rejected' },
  ];
  const colors = ['#1CD083', '#5A69E2', '#48A9F8', '#8BC741'];
  const iconComponents = [EmojiPeople, Assignment, Cancel, Chat];

  if (accessCheckLoading || loading) {
    return <CircularProgress color="primary" />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', p: { xs: '30px 16px', md: '30px' } }}>
      <StatsSection
        stats={stats}
        iconComponents={iconComponents}
        colors={colors}
        statusState={statusState}
      />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 5 }}>
        <UserProfileCard type="student" userData={student} />;
        <DashboardJobSection
          title="Recommended Jobs"
          jobs={allJobPosts}
          buttonText={allJobPosts.length > 3 ? 'More Jobs' : 'Go To Jobs Page'}
          buttonLink="/job-portal/search-job"
          showAddIcon={allJobPosts.length > 3}
        />
      </Box>
    </Box>
  );
}

const Dashboard = () => {
  return <JpLayoutWithSidebar role="student">{<StudentDashboard />}</JpLayoutWithSidebar>;
};

export default Dashboard;
