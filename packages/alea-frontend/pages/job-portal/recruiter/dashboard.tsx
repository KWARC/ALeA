import { Group, HourglassEmpty, HowToReg, TaskAlt } from '@mui/icons-material';
import { Box, CircularProgress, Typography } from '@mui/material';
import {
  APPLICATION_STATUS,
  canAccessResource,
  getJobApplicationsByJobPost,
  getJobPosts,
  getOrganizationProfile,
  getRecruiterProfile,
  JobApplicationInfo,
  JobPostInfo,
  OrganizationData,
  RecruiterData,
} from '@alea/spec';
import { Action, ResourceName } from '@alea/utils';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import {
  RecruiterProfileData,
  UserProfileCard,
} from '../../../components/job-portal/UserProfileCard';
import JpLayoutWithSidebar from '../../../layouts/JpLayoutWithSidebar';
import { DashboardJobSection, OFFER_STATUSES, StatsSection } from '../student/dashboard';

export function RecruiterDashboard() {
  const [loading, setLoading] = useState(true);
  const [recruiter, setRecruiter] = useState<RecruiterData>(null);
  const [organization, setOrganization] = useState<OrganizationData>(null);
  const [statusState, setStatusState] = useState<{
    totalApplications: number;
    pendingApplications: number;
    shortlistedCandidates: number;
    offeredCandidates: number;
  }>({
    totalApplications: 0,
    pendingApplications: 0,
    shortlistedCandidates: 0,
    offeredCandidates: 0,
  });
  const [jobPostsByRecruiter, setJobPostsByRecruiter] = useState<JobPostInfo[]>([]);
  const router = useRouter();
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      let recProfile: RecruiterData;
      try {
        recProfile = await getRecruiterProfile();
        if (!recProfile?.organizationId) {
          console.error('Recruiter profile or organization ID missing');
          router.push('/job-portal');
          return;
        }
        setRecruiter(recProfile);
        const hasAccess = await canAccessResource(
          ResourceName.JOB_PORTAL_ORG,
          Action.MANAGE_JOB_POSTS,
          { orgId: String(recProfile.organizationId) }
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
      try {
        const organizationDetail = await getOrganizationProfile(recProfile.organizationId);
        setOrganization(organizationDetail);
        const orgJobPosts = await getJobPosts(organizationDetail.id);
        const recruiterPosts = orgJobPosts.filter(
          (post) => post.createdByUserId === recProfile.userId
        );
        setJobPostsByRecruiter(recruiterPosts);
        const applicationsByJobPost = await Promise.all(
          recruiterPosts.map(async (job) => {
            try {
              const applications = await getJobApplicationsByJobPost(job.id);
              return { jobId: job.id, applications };
            } catch (err) {
              console.error(`Error fetching applications for job ${job.id}:`, err);
              return { jobId: job.id, applications: [] };
            }
          })
        );
        const applicationsMap = applicationsByJobPost.reduce((acc, { jobId, applications }) => {
          acc[jobId] = applications;
          return acc;
        }, {} as Record<number, JobApplicationInfo[]>);
        setStatusState(transformApplicationData(applicationsMap));
      } catch (error) {
        console.error('Error fetching organization/job data:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const stats = [
    //TODO , later on will add Interviews
    { key: 'totalApplications', label: 'Applications Received' },
    { key: 'pendingApplications', label: 'Pending Applications' },
    { key: 'shortlistedCandidates', label: 'Shortlisted Candidates' },
    { key: 'offeredCandidates', label: 'Offer Sent' },
  ];
  const colors = ['#1CD083', '#5A69E2', '#48A9F8', '#8BC741'];
  const iconComponents = [Group, HourglassEmpty, HowToReg, TaskAlt];
  const transformApplicationData = (applicationData: { [jobId: string]: JobApplicationInfo[] }) => {
    const stats = {
      totalApplications: 0,
      pendingApplications: 0,
      shortlistedCandidates: 0,
      offeredCandidates: 0,
    };
    Object.values(applicationData).forEach((applications) => {
      applications.forEach(({ applicationStatus }) => {
        stats.totalApplications += 1;

        if (applicationStatus === APPLICATION_STATUS.APPLIED) {
          stats.pendingApplications += 1;
        } else if (applicationStatus === APPLICATION_STATUS.SHORTLISTED_FOR_INTERVIEW) {
          stats.shortlistedCandidates += 1;
        } else if (OFFER_STATUSES.includes(applicationStatus)) {
          stats.offeredCandidates += 1;
        }
      });
    });
    return stats;
  };

  const recruiterWithOrg: RecruiterProfileData | null = useMemo(() => {
    if (!recruiter || !organization) return null;
    const { domain, id, ...orgWithoutFields } = organization;
    const { organizationId, ...recruiterWithoutOrgId } = recruiter;
    return {
      ...recruiterWithoutOrgId,
      organization: orgWithoutFields,
    };
  }, [recruiter, organization]);

  if (loading) {
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
      <Typography
        variant="body2"
        sx={{
          mt: 1.5,
          color: 'text.secondary',
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        The statistics above represent aggregated data across your entire organization.
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 5 }}>
        <UserProfileCard type="recruiter" userData={recruiterWithOrg} />
        <DashboardJobSection
          title="Jobs posted by your organization"
          jobs={jobPostsByRecruiter}
          buttonText="Post More Jobs"
          buttonLink="/job-portal/recruiter/create-job"
          hideJobRedirect={true}
        />
      </Box>
    </Box>
  );
}

const Dashboard = () => {
  return <JpLayoutWithSidebar role="recruiter">{<RecruiterDashboard />}</JpLayoutWithSidebar>;
};

export default Dashboard;
