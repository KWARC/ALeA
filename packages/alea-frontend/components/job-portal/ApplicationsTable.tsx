import {
  Cancel,
  Download,
  FileOpen,
  PauseCircle,
  PersonAdd,
  Visibility,
} from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { useState } from 'react';
import { getSocialIcon } from './UserProfileCard';
import { ApplicationWithProfile, updateJobApplication } from '@alea/spec';
import { UserProfileModal } from '../../pages/job-portal/recruiter/make-offer';

const ActionButtons = ({
   application,
   updateApplication,
}: {
  application: ApplicationWithProfile;
  updateApplication: (updatedApplication: ApplicationWithProfile) => void;
}) => {
  async function handleShortlistApplication(application: ApplicationWithProfile) {
    try {
      await updateJobApplication({
        id: application.id,
        action: 'SHORTLIST_FOR_INTERVIEW',
        // message:''//TODO
      });

      updateApplication({
        ...application,
        applicationStatus: 'SHORTLISTED_FOR_INTERVIEW',
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRejectApplication(application: ApplicationWithProfile) {
    try {
      await updateJobApplication({
        id: application.id,
        action: 'REJECT',
        // message:''//TODO
      });

      updateApplication({
        ...application,
        applicationStatus: 'REJECTED',
      });
    } catch (err) {
      console.error(err);
    }
  }
  async function handleKeepOnHoldApplication(application: ApplicationWithProfile) {
    try {
      await updateJobApplication({
        id: application.id,
        action: 'ON_HOLD',
        // message:''//TODO
      });

      updateApplication({
        ...application,
        applicationStatus: 'ON_HOLD',
      });
    } catch (err) {
      console.error(err);
    }
  }
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Tooltip
        title={
          application.applicationStatus === 'SHORTLISTED_FOR_INTERVIEW'
            ? 'Shortlisted'
            : 'Shortlist for Interview'
        }
      >
        <span>
          <IconButton
            color="primary"
            onClick={() => handleShortlistApplication(application)}
            disabled={application.applicationStatus === 'SHORTLISTED_FOR_INTERVIEW'}
          >
            <PersonAdd />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={application.applicationStatus === 'ON_HOLD' ? 'On Hold' : 'Keep on Hold'}>
        <span>
          <IconButton
            color="warning"
            onClick={() => handleKeepOnHoldApplication(application)}
            disabled={application.applicationStatus === 'ON_HOLD'}
          >
            <PauseCircle />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={application.applicationStatus === 'REJECTED' ? 'Rejected' : 'Reject Applicant'}>
        <span>
          <IconButton
            color="error"
            onClick={() => handleRejectApplication(application)}
            disabled={application.applicationStatus === 'REJECTED'}
          >
            <Cancel />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

const SocialLinks = ({ socialLinks }) => {
  if (!socialLinks)
    return (
      <Typography variant="body2" color="textSecondary">
        No links available
      </Typography>
    );

  const normalizeUrl = (url) => {
    if (!url || url.trim() === '' || url === 'N/A') return null;
    return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  };

  return (
    <Box>
      {Object.entries(socialLinks).map(([platform, rawUrl], index) => {
        const url = normalizeUrl(String(rawUrl));

        return (
          <Tooltip key={index} title={platform.charAt(0).toUpperCase() + platform.slice(1)} arrow>
            <span>
              <IconButton
                component="a"
                href={url || undefined}
                target={url ? '_blank' : undefined}
                rel={url ? 'noopener noreferrer' : undefined}
                disabled={!url}
                sx={{
                  opacity: url ? 1 : 0.4,
                  cursor: url ? 'pointer' : 'not-allowed',
                }}
              >
                {getSocialIcon(platform)}
              </IconButton>
            </span>
          </Tooltip>
        );
      })}
    </Box>
  );
};

const ApplicationRow = ({
   application,
  index,
  updateApplication,
}: {
  application: ApplicationWithProfile;
  index: number;
  updateApplication: (updatedApplication: ApplicationWithProfile) => void;
}) => {
  const [selectedProfile, setSelectedProfile] = useState(null);
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

  const handleCloseProfile = () => {
    setSelectedProfile(null);
  };
  const handleDownloadResume = (applicant: ApplicationWithProfile) => {
    alert('Download Functionality not active as of now');
  };
  return (
    <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' } }}>
      <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</TableCell>
      <TableCell sx={{ textAlign: 'center' }}>
        <Box sx={{ textAlign: 'left' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1" fontWeight="bold">
              {application.studentProfile.name}
            </Typography>
            <IconButton color="primary" onClick={() => handleViewApplicant(application)}>
              <Visibility />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
            <Typography variant="body2" color="textSecondary">
              Status:
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="textSecondary">
              {application.applicationStatus || 'Pending'}
            </Typography>
          </Box>
        </Box>
        <UserProfileModal
          open={Boolean(selectedProfile)}
          profile={selectedProfile}
          onClose={handleCloseProfile}
        />
      </TableCell>
      <TableCell sx={{ textAlign: 'center' }}>{application?.jobPostTitle}</TableCell>
      <TableCell sx={{ textAlign: 'center' }}>
        <SocialLinks socialLinks={application.studentProfile.socialLinks} />
      </TableCell>
      <TableCell sx={{ textAlign: 'center' }}>
        <ActionButtons application={application} updateApplication={updateApplication} />
      </TableCell>
      <TableCell sx={{ textAlign: 'center' }}>
        {new Date(application.createdAt).toLocaleString()}
      </TableCell>
      <TableCell sx={{ textAlign: 'center' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <Tooltip title="View Resume" arrow>
            <Link href={application?.studentProfile?.resumeUrl || '#'} passHref legacyBehavior>
              <a target="_blank" rel="noopener noreferrer">
                <IconButton color="primary">
                  <FileOpen />
                </IconButton>
              </a>
            </Link>
          </Tooltip>

          <Typography variant="body2" color="textSecondary">
            |
          </Typography>

          <Tooltip title="Download Resume" arrow>
            <IconButton color="secondary" onClick={() => handleDownloadResume(application)}>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
};
export const 

ApplicationTable = ({
  loading,
  filteredApplications,
  setFilteredApplications,
}: {
  loading: boolean;
  filteredApplications: ApplicationWithProfile[];
  setFilteredApplications: React.Dispatch<React.SetStateAction<ApplicationWithProfile[]>>;
}) => {
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const handleSort = (criteria: 'date' | 'name') => {
    const sortedApplications = [...filteredApplications];
    if (criteria === 'date') {
      sortedApplications.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (criteria === 'name') {
      sortedApplications.sort((a, b) => a.studentProfile.name.localeCompare(b.studentProfile.name));
    }
    setFilteredApplications(sortedApplications);
    setSortBy(criteria);
  };
  const updateApplication = (updatedApplication: ApplicationWithProfile) => {
    setFilteredApplications((prev: ApplicationWithProfile[]) =>
      prev.map((application) => (application.id === updatedApplication.id ? updatedApplication : application))
    );
  };
  return (
    <Box>
      {loading ? (
        <CircularProgress />
      ) : filteredApplications.length > 0 ? (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              sx={{
                bgcolor: sortBy === 'name' ? '#5A46C6' : '#806BE7',
                color: 'white',
                '&:hover': { bgcolor: '#5A46C6' },
              }}
              onClick={() => handleSort('name')}
            >
              Sort By Name
            </Button>

            <Button
              sx={{
                bgcolor: sortBy === 'date' ? '#5A46C6' : '#806BE7',
                color: 'white',
                '&:hover': { bgcolor: '#5A46C6' },
              }}
              onClick={() => handleSort('date')}
            >
              Sort By Date
            </Button>
          </Box>

          <TableContainer
            sx={{ maxHeight: '500px', overflowY: 'auto', mt: '20px', borderRadius: '20px' }}
          >
            <Table sx={{ minWidth: 650 }} aria-label="job applicants table">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.main', color: 'white' }}>
                  <TableCell sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
                    S.No.
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
                    Candidate Name
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
                    Applied For
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
                    Social Links
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
                    Actions
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
                    Applied On
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
                    Resume
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredApplications.map((application, index) => (
                  <ApplicationRow
                    key={application.id}
                    application={application}
                    index={index}
                    updateApplication={updateApplication}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ) : (
        <Typography variant="body1" color="textSecondary">
          No applicants yet for this job.
        </Typography>
      )}
    </Box>
  );
};
