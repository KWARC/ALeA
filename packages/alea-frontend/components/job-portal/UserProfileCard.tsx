import { GitHub, InsertDriveFile, LinkedIn, Twitter, YouTube } from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tooltip,
  Typography,
} from '@mui/material';
import { OrganizationData, RecruiterData, StudentData } from '@alea/spec';
import Link from 'next/link';
import { useState } from 'react';

export const getSocialIcon = (name) => {
  switch (name.toLowerCase()) {
    case 'linkedin':
      return <LinkedIn sx={{ color: ' #0077b5' }} />;
    case 'twitter':
      return <Twitter sx={{ color: ' #08a0e9' }} />;
    case 'github':
      return <GitHub sx={{ color: 'black' }} />;
    case 'youtube':
      return <YouTube sx={{ color: 'red' }} />;

    default:
      return (
        <Avatar sx={{ bgcolor: '#806BE7', color: 'white', fontWeight: 'bold' }}>
          {name[0].toUpperCase()}
        </Avatar>
      );
  }
};
export type RecruiterProfileData = Omit<RecruiterData, 'organizationId'> & {
  organization: Omit<OrganizationData, 'domain' | 'id'>;
};
export const UserProfileCard = ({
  type,
  userData,
  showPortfolioLinks = false,
}: {
  type: 'student' | 'recruiter' | 'admin';
  userData: StudentData | RecruiterProfileData;
  showPortfolioLinks?: boolean;
}) => {
  const [aboutDialog, setAboutDialog] = useState(false);
  if (!userData) return;
  const name = userData.name;
  const userId = userData.userId;
  const email = userData.email;
  const mobile = userData?.mobile;
  const altMobile = userData?.altMobile;
  const about = userData?.about || '-';
  const socialLinks = userData?.socialLinks;

  return (
    <Box
      sx={{
        flex: '1 1 300px',
        p: 1,
        borderRadius: 3,
        backgroundColor: '#f9f9f9',
        boxShadow: 3,
      }}
    >
      <Box sx={{ p: 3, borderRadius: 3, backgroundColor: '#f9f9f9', boxShadow: 3, mb: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Avatar
            sx={{
              width: 100,
              height: 100,
              mx: 'auto',
              bgcolor: 'primary.main',
              color: 'white',
              fontSize: 32,
            }}
          >
            {name?.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="h6" sx={{ mt: 2, fontWeight: 'bold' }}>
            {name} {userId && `(${userId})`}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Email
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {email || '-'}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Contact No
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {mobile || '-'}
            {altMobile && `  (${altMobile})`}
          </Typography>
        </Box>

        {type === 'student' && (
          <>
            {[
              ['Programme', (userData as StudentData).programme],
              ['Courses', (userData as StudentData).courses],
              ['Year of Admission', (userData as StudentData).yearOfAdmission],
              ['Year of Graduation', (userData as StudentData).yearOfGraduation],
              ['GPA', (userData as StudentData).gpa],
            ].map(([label, value]) => (
              <Box key={label} sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {value || '-'}
                </Typography>
              </Box>
            ))}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Resume
              </Typography>
              {(userData as StudentData).resumeUrl ? (
                <Link
                  href={(userData as StudentData).resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <InsertDriveFile sx={{ color: '#1976d2' }} />
                  Open Resume
                </Link>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No resume available
                </Typography>
              )}
            </Box>
          </>
        )}

        {type === 'recruiter' && (
          <>
            {[
              ['Position', (userData as RecruiterProfileData).position],
              ['Organization Name', (userData as RecruiterProfileData)?.organization.companyName],
              ['Organization Type', (userData as RecruiterProfileData)?.organization.companyType],
              ['Organization Website', (userData as RecruiterProfileData)?.organization.website],
              [
                'Organization Address',
                `${(userData as RecruiterProfileData)?.organization.officeAddress || '-'} ${
                  (userData as RecruiterProfileData)?.organization.officePostalCode || '-'
                }`,
              ],
            ].map(([label, value]) => (
              <Box key={label} sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {value || '-'}
                </Typography>
              </Box>
            ))}
          </>
        )}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            About
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {about.length > 150 ? about.slice(0, 150) + '...' : about}
            {about.length > 150 && (
              <span
                onClick={() => setAboutDialog(true)}
                style={{ color: '#1976d2', cursor: 'pointer', fontWeight: 500 }}
              >
                Read more
              </span>
            )}
          </Typography>
          <Dialog open={aboutDialog} onClose={() => setAboutDialog(false)} sx={{ zIndex: 5000 }}>
            <DialogTitle>About</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary">
                {about}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAboutDialog(false)} color="primary">
                Close
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>

      {showPortfolioLinks && (
        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            backgroundColor: '#f9f9f9',
            boxShadow: 3,
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
            Portfolios
          </Typography>
          {socialLinks && Object.keys(socialLinks).length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.entries(socialLinks).map(([name, url], index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Tooltip title={name.charAt(0).toUpperCase() + name.slice(1)} arrow>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        mr: 2,
                        bgcolor: 'white',
                        fontSize: 'large',
                        cursor: 'pointer',
                      }}
                    >
                      {getSocialIcon(name)}
                    </Avatar>
                  </Tooltip>
                  {url && url !== 'N/A' ? (
                    <Link href={String(url)} passHref legacyBehavior>
                      <a
                        target="_blank"
                        style={{
                          fontSize: 16,
                          fontWeight: 'bold',
                          color: '#333',
                          textDecoration: 'underline',
                        }}
                      >
                        {String(url)}
                      </a>
                    </Link>
                  ) : (
                    <Typography sx={{ fontSize: 16, fontWeight: 'bold', color: '#777' }}>
                      N/A
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography>No social links available</Typography>
          )}
        </Box>
      )}
    </Box>
  );
};
