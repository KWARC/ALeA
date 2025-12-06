import { Business, Email, Work } from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Typography,
} from '@mui/material';
import {
  canAccessResource,
  getJobPosts,
  getOrganizationProfile,
  getRecruiterProfile,
  JobPostInfo,
  OrganizationData,
  RecruiterAndOrgData,
  RecruiterData,
} from '@alea/spec';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import RecruiterProfileDialog from '../../../../alea-frontend/components/job-portal/RecruiterProfileDialog';
import MainLayout from '../../../../alea-frontend/layouts/MainLayout';
import RecruiterJobDialog from '../../../components/job-portal/RecruiterJobDialog';
import { RecruiterJobsPanel } from '../../../components/job-portal/RecruiterJobsPanel';

const HeaderSection = () => (
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
      Recruiter Dashboard
    </Typography>
    <Typography variant="subtitle1">Your professional profile at a glance</Typography>
  </Box>
);

const ActionButtons = ({
  setIsOpen,
  setIsJobDialogOpen,
  isJobDialogOpen,
  handleRefresh,
}: {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsJobDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isJobDialogOpen: boolean;
  handleRefresh: () => Promise<void>;
}) => (
  <Box
    sx={{
      display: 'flex',
      gap: '16px',
      ml: '30px',
    }}
  >
    <Button variant="contained" onClick={() => setIsOpen(true)}>
      Edit Profile
    </Button>
    <Button variant="contained" onClick={() => setIsJobDialogOpen(true)}>
      Create JobPost
    </Button>

    {isJobDialogOpen && (
      <RecruiterJobDialog
        open={isJobDialogOpen}
        onClose={() => setIsJobDialogOpen(false)}
        onUpdate={handleRefresh}
      />
    )}
  </Box>
);

const RecruiterInfoCard = ({
  name,
  position,
  email,
  recruiter,
}: {
  name: string;
  position: string;
  email: string;
  recruiter: RecruiterData;
}) => (
  <CardContent>
    <Box display="flex" alignItems="center" mb={2}>
      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
        <Work />
      </Avatar>
      <Typography variant="h6">Recruiter Information</Typography>
    </Box>
    <Typography>
      <strong>Name:</strong> {name}
    </Typography>
    <Typography>
      <strong>Position:</strong> {position}
    </Typography>
    <Typography>
      <Email sx={{ verticalAlign: 'middle', mr: 1 }} />
      <strong>Email:</strong> {email}
    </Typography>
    <Typography>
      <strong>Mobile:</strong> {recruiter.mobile || 'N/A'}
    </Typography>
    <Typography>
      <strong>Alternate Mobile:</strong> {recruiter.altMobile || 'N/A'}
    </Typography>
  </CardContent>
);

const OrganizationInfoCard = ({
  companyName,
  isStartup,
  companyType,
  incorporationYear,
  website,
  about,
  officeAddress,
  officePostalCode,
}: {
  companyName: string;
  isStartup: boolean;
  companyType: string;
  incorporationYear: string;
  website: string;
  about: string;
  officeAddress: string;
  officePostalCode: string;
}) => (
  <CardContent>
    <Box display="flex" alignItems="center" mb={2}>
      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
        <Business />
      </Avatar>
      <Typography variant="h6">Organization Details</Typography>
    </Box>
    <Typography>
      <strong>Organization:</strong> {companyName}
    </Typography>
    <Typography>
      <Typography>
        <strong>Startup:</strong> {isStartup ? 'Yes' : 'No'}
      </Typography>
    </Typography>
    <Typography>
      <strong>Company Type:</strong> {companyType || 'N/A'}
    </Typography>
    <Typography>
      <strong>Incorporation Year:</strong> {incorporationYear || 'N/A'}
    </Typography>
    <Typography>
      <strong>Website:</strong> {website || 'N/A'}
    </Typography>
    <Typography>
      <strong>About:</strong> {about || 'N/A'}
    </Typography>
    <Typography>
      <strong>Office Address:</strong> {officeAddress || 'N/A'}
    </Typography>
    <Typography>
      <strong>Office Postal Code:</strong> {officePostalCode || 'N/A'}
    </Typography>
  </CardContent>
);

export const JobPostsSection = ({
  totalJobPosts,
  setTotalJobPosts,
  handleRefresh,
}: {
  totalJobPosts: JobPostInfo[];
  setTotalJobPosts: React.Dispatch<React.SetStateAction<JobPostInfo[]>>;
  handleRefresh: () => Promise<void>;
}) => (
  <Card sx={{ boxShadow: 6, mb: 4, px: { xs: 2, md: 4 }, py: 2 }}>
    <CardContent>
      <Typography variant="h5" gutterBottom>
        Created Jobs
      </Typography>
    </CardContent>
    <RecruiterJobsPanel
      totalJobPosts={totalJobPosts}
      setTotalJobPosts={setTotalJobPosts}
      onUpdate={handleRefresh}
    />
  </Card>
);

const RecruiterDashboard = () => {
  const [recruiter, setRecruiter] = useState<RecruiterData>(null);
  const [organizationData, setOrganizationData] = useState<OrganizationData>({
    id: null,
    companyName: '',
    incorporationYear: '',
    isStartup: false,
    about: '',
    website: '',
    companyType: '',
    officeAddress: '',
    officePostalCode: '',
    domain: '',
  });
  const [loading, setLoading] = useState(true);
  const [accessCheckLoading, setAccessCheckLoading] = useState(true);
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [totalJobPosts, setTotalJobPosts] = useState<JobPostInfo[]>([]);

  useEffect(() => {
    const checkAccess = async () => {
      setAccessCheckLoading(true);
      const hasAccess = await canAccessResource(ResourceName.JOB_PORTAL, Action.MANAGE_JOB_POSTS, {
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

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const recruiterData = await getRecruiterProfile();
      setRecruiter(recruiterData);
      const organizationId = recruiterData?.organizationId;
      if (organizationId) {
        const orgData = await getOrganizationProfile(organizationId);
        setOrganizationData(orgData);
      } else {
        console.warn("Recruiter doesn't have an organization.");
      }
      if (organizationId) {
        const jobPosts = await getJobPosts(organizationId);
        setTotalJobPosts(jobPosts);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessCheckLoading) return;
    fetchProfileData();
  }, [accessCheckLoading, isOpen]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      if (!recruiter?.organizationId) {
        console.error('Organization ID is undefined.');
        return;
      }
      const jobPosts = await getJobPosts(recruiter.organizationId);
      setTotalJobPosts(jobPosts);
    } catch (error) {
      console.error('Error refreshing job post data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (accessCheckLoading || loading) {
    return <CircularProgress color="primary" />;
  }

  if (!recruiter) {
    return (
      <Box textAlign="center" mt={5}>
        <Typography variant="h6" color="error">
          You are currently not registered on job portal, Register first to access recruiter
          dashboard
        </Typography>
      </Box>
    );
  }
  const { name, email, position } = recruiter;

  const {
    companyName,
    incorporationYear,
    isStartup,
    about,
    website,
    companyType,
    officeAddress,
    officePostalCode,
  } = organizationData;

  const recruiterAndOrgData: RecruiterAndOrgData = { ...recruiter, ...organizationData };

  return (
    <MainLayout title="Recruiter Dashboard | Job Portal">
      {isOpen && (
        <RecruiterProfileDialog
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          recruiterAndOrgData={recruiterAndOrgData}
        />
      )}

      <Box>
        <HeaderSection />
        <ActionButtons
          setIsOpen={setIsOpen}
          setIsJobDialogOpen={setIsJobDialogOpen}
          isJobDialogOpen={isJobDialogOpen}
          handleRefresh={handleRefresh}
        />

        <Box sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
          <Card sx={{ boxShadow: 6, mb: 4, px: { xs: 2, md: 4 }, py: 2 }}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <RecruiterInfoCard
                  name={name}
                  position={position}
                  email={email}
                  recruiter={recruiter}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <OrganizationInfoCard
                  companyName={companyName}
                  isStartup={isStartup}
                  companyType={companyType}
                  incorporationYear={incorporationYear}
                  website={website}
                  about={about}
                  officeAddress={officeAddress}
                  officePostalCode={officePostalCode}
                />
              </Grid>
            </Grid>
          </Card>

          <JobPostsSection
            totalJobPosts={totalJobPosts}
            setTotalJobPosts={setTotalJobPosts}
            handleRefresh={handleRefresh}
          />
        </Box>
      </Box>
    </MainLayout>
  );
};

export default RecruiterDashboard;
