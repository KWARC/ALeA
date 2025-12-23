import {
  ApplicationWithProfile,
  canAccessResource,
  getJobPosts,
  getRecruiterProfile,
  JobPostInfo,
  RecruiterData,
  updateJobApplication,
} from '@alea/spec';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Modal,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { Cancel, History, Visibility } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Action, PRIMARY_COL, ResourceName } from '@alea/utils';
import { JobSelect } from './applications';
import { UserProfileCard } from '../../../components/job-portal/UserProfileCard';
import JobApplicationTimelineModal from '../../../components/job-portal/ApplicationTimelineModal';
import JpLayoutWithSidebar from '../../../layouts/JpLayoutWithSidebar';

export const UserProfileModal = ({
  open,
  onClose,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  profile: any;
}) => {
  if (!profile) return null;

  return (
    <Modal sx={{ zIndex: 2005 }} open={open} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#e0e0e0',
          maxWidth: '600px',
          maxHeight: '80vh',
          minWidth: { xs: '90vw', sm: 400 },
          p: 2,
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 1,
            bgcolor: '#f5f3f0',
          }}
        >
          <Cancel sx={{ color: 'red' }} />
        </IconButton>

        <Box
          sx={{
            overflowY: 'auto',
            paddingRight: 1,
          }}
        >
          <UserProfileCard type="student" userData={profile} showPortfolioLinks />
        </Box>
      </Box>
    </Modal>
  );
};

export const OfferMakingTable = ({
  applications,
  updateApplication,
  loading,
}: {
  applications: ApplicationWithProfile[];
  updateApplication: (updatedApplication: ApplicationWithProfile) => void;
  loading: boolean;
}) => {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);

  const handleViewApplicant = (application: ApplicationWithProfile) => {
    const profile = { ...application.studentProfile };
    const socialLinks = profile?.socialLinks || {};
    profile.socialLinks = {
      linkedin: socialLinks.linkedin || 'N/A',
      github: socialLinks.github || 'N/A',
      twitter: socialLinks.twitter || 'N/A',
      ...socialLinks,
    };
    setSelectedProfile(profile);
  };

  const handleMakeOffer = async (
    application: ApplicationWithProfile,
    updateApplication: (updatedApplication: ApplicationWithProfile) => void
  ) => {
    try {
      await updateJobApplication({
        id: application.id,
        action: 'SEND_OFFER',
        // message:''//TODO
      });

      updateApplication({
        ...application,
        applicationStatus: 'OFFERED',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleWithdrawOffer = async (
    application: ApplicationWithProfile,
    updateApplication: (updatedApplication: ApplicationWithProfile) => void
  ) => {
    try {
      await updateJobApplication({
        id: application.id,
        action: 'REVOKE_OFFER',
        // message:''//TODO
      });

      updateApplication({
        ...application,
        applicationStatus: 'OFFER_REVOKED',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseProfile = () => {
    setSelectedProfile(null);
  };
  const handleOpenTimeline = () => setShowTimeline(true);
  const handleCloseTimeline = () => setShowTimeline(false);
  const renderCandidateResponse = (applicationStatus) => {
    if (
      !['OFFER_ACCEPTED', 'OFFERED', 'OFFER_REJECTED', 'OFFER_REVOKED'].includes(applicationStatus)
    ) {
      return (
        <Typography variant="body2" color="text.secondary">
          No offer sent
        </Typography>
      );
    }
    if (applicationStatus === 'OFFERED') {
      return <Chip label="Awaiting response" size="small" color="warning" variant="outlined" />;
    }
    if (applicationStatus === 'OFFER_ACCEPTED') {
      return <Chip label="Offer accepted" size="small" color="success" />;
    }
    if (applicationStatus === 'OFFER_REJECTED') {
      return <Chip label="Offer rejected" size="small" color="error" />;
    }
    if (applicationStatus === 'OFFER_REVOKED') {
      return <Chip label="Offer revoked" size="small" color="error" />;
    }
    return null;
  };

  const renderAction = (application: ApplicationWithProfile) => {
    const applicationStatus = application.applicationStatus;

    if (!['OFFER_ACCEPTED', 'OFFERED', 'OFFER_REJECTED'].includes(applicationStatus)) {
      return (
        <Button
          variant="contained"
          size="small"
          onClick={() => handleMakeOffer(application, updateApplication)}
        >
          Make Offer
        </Button>
      );
    }

    if (['OFFER_ACCEPTED', 'OFFERED', 'OFFER_REJECTED'].includes(applicationStatus)) {
      return (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Chip label="Offer Made" size="small" color="success" />
          {(applicationStatus === 'OFFERED' || applicationStatus === 'OFFER_ACCEPTED') && (
            <Button
              size="small"
              color="error"
              variant="outlined"
              onClick={() => handleWithdrawOffer(application, updateApplication)}
            >
              Revoke
            </Button>
          )}
        </Box>
      );
    }

    return (
      <Typography variant="body2" color="text.secondary">
        Action completed
      </Typography>
    );
  };

  return (
    <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'auto' }}>
      <Box sx={{ p: 2, bgcolor: '#f9fafb', borderBottom: '1px solid #eee' }}>
        <Typography variant="subtitle2" color="text.secondary">
          Make offers and track candidate responses for candidates shortlisted for interview.
        </Typography>
      </Box>

      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: '#fafafa' }}>
            <TableCell sx={{ textAlign: 'center' }}>
              <b>Candidate</b>
            </TableCell>
            <TableCell sx={{ textAlign: 'center' }}>
              <b>Email</b>
            </TableCell>
            <TableCell sx={{ textAlign: 'center' }}>
              <b>Candidate Response</b>
            </TableCell>
            <TableCell sx={{ textAlign: 'center' }}>
              <b>Action</b>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                <CircularProgress />
              </TableCell>
            </TableRow>
          ) : applications.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">No shortlisted candidates found</Typography>
              </TableCell>
            </TableRow>
          ) : (
            applications.map((application) => (
              <TableRow key={application.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 1 }}
                  >
                    <Typography fontWeight={500}>
                      {application.studentProfile?.name || '—'}
                    </Typography>
                    <IconButton color="primary" onClick={() => handleViewApplicant(application)}>
                      <Visibility />
                    </IconButton>

                    <Tooltip title="View Application Timeline" arrow>
                      <IconButton color="info" size="small" onClick={handleOpenTimeline}>
                        <History fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <JobApplicationTimelineModal
                    open={showTimeline}
                    applicationId={application.id}
                    onClose={handleCloseTimeline}
                  />
                  <UserProfileModal
                    open={Boolean(selectedProfile)}
                    profile={selectedProfile}
                    onClose={handleCloseProfile}
                  />
                </TableCell>

                <TableCell sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {application.studentProfile?.email || '—'}
                  </Typography>
                </TableCell>

                <TableCell sx={{ textAlign: 'center' }}>
                  {renderCandidateResponse(application.applicationStatus)}
                </TableCell>

                <TableCell sx={{ textAlign: 'center' }}>{renderAction(application)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Paper>
  );
};

const MakeOffer = () => {
  const [jobPosts, setJobPosts] = useState<JobPostInfo[]>([]);
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [accessCheckLoading, setAccessCheckLoading] = useState(false);
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
  const shortlistedStatuses = [
    'SHORTLISTED_FOR_INTERVIEW',
    'OFFERED',
    'OFFER_REVOKED',
    'OFFER_ACCEPTED',
    'OFFER_REJECTED',
  ];

  const shortlistedApplications = applications.filter((application) =>
    shortlistedStatuses.includes(application.applicationStatus)
  );
  const updateApplication = (updatedApplication: ApplicationWithProfile) => {
    setApplications((prev: ApplicationWithProfile[]) =>
      prev.map((application) =>
        application.id === updatedApplication.id ? updatedApplication : application
      )
    );
  };
  if (accessCheckLoading) return <CircularProgress />;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" fontWeight="bold" color={PRIMARY_COL}>
        Make Offers
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
        <JobSelect jobPosts={jobPosts} setApplications={setApplications} setLoading={setLoading} />
      </Box>
      <OfferMakingTable
        applications={shortlistedApplications}
        updateApplication={updateApplication}
        loading={loading}
      />
    </Box>
  );
};

const MakeOfferPage = () => {
  return <JpLayoutWithSidebar role="recruiter">{<MakeOffer />}</JpLayoutWithSidebar>;
};

export default MakeOfferPage;
