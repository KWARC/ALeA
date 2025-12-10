import {
  ApplicantWithProfile,
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
  Typography,
} from '@mui/material';
import JpLayoutWithSidebar from 'packages/alea-frontend/layouts/JpLayoutWithSidebar';
import { useEffect, useState } from 'react';
import { JobSelect } from './applications';
import { useRouter } from 'next/router';
import { Action, PRIMARY_COL, ResourceName } from '@alea/utils';
import { Cancel, Visibility } from '@mui/icons-material';
import { UserProfileCard } from 'packages/alea-frontend/components/job-portal/UserProfileCard';

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

export const OfferApplicantsTable = ({
  applicants,
  updateApplicant,
  loading,
}: {
  applicants: ApplicantWithProfile[];
  updateApplicant: (updatedApplicant: ApplicantWithProfile) => void;
  loading: boolean;
}) => {
  const [selectedProfile, setSelectedProfile] = useState(null);

  const handleViewApplicant = (applicant: ApplicantWithProfile) => {
    const profile = { ...applicant.studentProfile };
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
    applicant: ApplicantWithProfile,
    updateApplicant: (updatedApplicant: ApplicantWithProfile) => void
  ) => {
    try {
      const application = {
        ...applicant,
        applicationStatus: 'OFFERED',
        recruiterAction: 'SEND_OFFER',
      };
      const res = await updateJobApplication(application);
      updateApplicant(application);
    } catch (error) {
      console.error('Failed to make offer', error);
    }
  };

  const handleWithdrawOffer = async (
    applicant: ApplicantWithProfile,
    updateApplicant: (updatedApplicant: ApplicantWithProfile) => void
  ) => {
    try {
      const application = {
        ...applicant,
        applicationStatus: 'OFFER_REVOKED',
        recruiterAction: 'REVOKE_OFFER',
      };
      const res = await updateJobApplication(application);
      updateApplicant(application);
    } catch (error) {
      console.error('Failed to withdraw offer', error);
    }
  };
  const handleCloseProfile = () => {
    setSelectedProfile(null);
  };
  const renderCandidateResponse = (applicationStatus) => {
    if (!['OFFER_ACCEPTED', 'OFFERED', 'OFFER_REJECTED'].includes(applicationStatus)) {
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
    return null;
  };

  const renderAction = (applicant: ApplicantWithProfile) => {
    const applicationStatus = applicant.applicationStatus;

    if (!['OFFER_ACCEPTED', 'OFFERED', 'OFFER_REJECTED'].includes(applicationStatus)) {
      return (
        <Button
          variant="contained"
          size="small"
          onClick={() => handleMakeOffer(applicant, updateApplicant)}
        >
          Make Offer
        </Button>
      );
    }

    if (['OFFER_ACCEPTED', 'OFFERED', 'OFFER_REJECTED'].includes(applicationStatus)) {
      return (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Chip label="Offer Made" size="small" color="success" />
          {applicationStatus === 'OFFERED' && (
            <Button
              size="small"
              color="error"
              variant="outlined"
              onClick={() => handleWithdrawOffer(applicant, updateApplicant)}
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
          ) : applicants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">No shortlisted candidates found</Typography>
              </TableCell>
            </TableRow>
          ) : (
            applicants.map((applicant) => (
              <TableRow key={applicant.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography fontWeight={500}>
                      {applicant.studentProfile?.name || '—'}
                    </Typography>
                    <IconButton color="primary" onClick={() => handleViewApplicant(applicant)}>
                      <Visibility />
                    </IconButton>
                  </Box>
                  <UserProfileModal
                    open={Boolean(selectedProfile)}
                    profile={selectedProfile}
                    onClose={handleCloseProfile}
                  />
                </TableCell>

                <TableCell sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {applicant.studentProfile?.email || '—'}
                  </Typography>
                </TableCell>

                <TableCell sx={{ textAlign: 'center' }}>
                  {renderCandidateResponse(applicant.applicationStatus)}
                </TableCell>

                <TableCell sx={{ textAlign: 'center' }}>{renderAction(applicant)}</TableCell>
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
  const [applicants, setApplicants] = useState<ApplicantWithProfile[]>([]);
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

  const shortlistedApplicants = applicants.filter((applicant) =>
    shortlistedStatuses.includes(applicant.applicationStatus)
  );
  const updateApplicant = (updatedApplicant: ApplicantWithProfile) => {
    setApplicants((prev: ApplicantWithProfile[]) =>
      prev.map((applicant) => (applicant.id === updatedApplicant.id ? updatedApplicant : applicant))
    );
  };
  if (accessCheckLoading) return <CircularProgress />;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" fontWeight="bold" color={PRIMARY_COL}>
        Make Offers
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
        <JobSelect jobPosts={jobPosts} setApplicants={setApplicants} setLoading={setLoading} />
      </Box>
      <OfferApplicantsTable
        applicants={shortlistedApplicants}
        updateApplicant={updateApplicant}
        loading={loading}
      />
    </Box>
  );
};

const MakeOfferPage = () => {
  return <JpLayoutWithSidebar role="recruiter">{<MakeOffer />}</JpLayoutWithSidebar>;
};

export default MakeOfferPage;
