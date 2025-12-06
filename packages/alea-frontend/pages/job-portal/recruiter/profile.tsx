import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import {
  canAccessResource,
  getOrganizationProfile,
  getRecruiterProfile,
  RecruiterData,
  updateRecruiterProfile,
} from '@alea/spec';
import { Action, PRIMARY_COL, ResourceName } from '@alea/utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { OrganizationDetails } from '../../../components/job-portal/OrganizationDetails';
import { UserProfileCard } from '../../../components/job-portal/UserProfileCard';
import JpLayoutWithSidebar from '../../../layouts/JpLayoutWithSidebar';

const ProfileForm = () => {
  const [profileData, setProfileData] = useState({
    name: '',
    userId: '',
    position: '',
    email: '',
    mobile: '',
    altMobile: '',
    about: '',
    socialLinks: {},
    organization: {
      id: null,
      domain: '',
      companyName: '',
      isStartup: false,
      companyType: '',
      incorporationYear: null,
      website: '',
      about: '',
      officeAddress: '',
      officePostalCode: '',
    },
  });
  const [loading, setLoading] = useState(true);
  const [recruiter, setRecruiter] = useState<RecruiterData>(null);
  const router = useRouter();
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        const res = await getRecruiterProfile();
        const parsedSocialLinks = res?.socialLinks || {};
        const requiredSocialLinks = {
          linkedin: parsedSocialLinks.linkedin || 'N/A',
          github: parsedSocialLinks.github || 'N/A',
          twitter: parsedSocialLinks.twitter || 'N/A',
          ...parsedSocialLinks,
        };
        setRecruiter(res);
        const hasAccess = await canAccessResource(
          ResourceName.JOB_PORTAL_ORG,
          Action.MANAGE_JOB_POSTS,
          { orgId: String(res.organizationId) }
        );
        if (!hasAccess) {
          alert('You do not have access to this page.');
          router.push('/job-portal');
          return;
        }
        const organizationDetail = await getOrganizationProfile(res.organizationId);
        setProfileData((prevData) => ({
          ...prevData,
          name: res?.name || '',
          userId: res?.userId || '',
          position: res?.position || '',
          email: res?.email || '',
          mobile: res?.mobile || '',
          altMobile: res?.altMobile || '',
          about: res.about,
          socialLinks: requiredSocialLinks,
          organization: {
            id: organizationDetail?.id,
            domain: organizationDetail.domain,
            companyName: organizationDetail?.companyName || '',
            isStartup: organizationDetail?.isStartup ?? false,
            companyType: organizationDetail?.companyType || '',
            incorporationYear: organizationDetail?.incorporationYear ?? null,
            website: organizationDetail?.website || '',
            about: organizationDetail?.about || '',
            officeAddress: organizationDetail?.officeAddress || '',
            officePostalCode: organizationDetail?.officePostalCode || '',
          },
        }));
      } catch (error) {
        console.error('Error initializing recruiter data:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSocialLinksChange = (event) => {
    const { name, value } = event.target;
    setProfileData((prevProfileData) => ({
      ...prevProfileData,
      socialLinks: {
        ...prevProfileData.socialLinks,
        [name]: value,
      },
    }));
  };
  const handleSave = async () => {
    try {
      setLoading(true);
      const updatedProfile = {
        name: profileData.name,
        email: profileData.email,
        mobile: profileData.mobile,
        altMobile: profileData.altMobile,
        position: profileData.position,
        about: profileData.about,
        organizationId: recruiter?.organizationId,
        socialLinks: JSON.stringify(profileData.socialLinks),
      };
      await updateRecruiterProfile(updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) return <CircularProgress />;
  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', p: { xs: '30px 16px', md: '30px' } }}>
      <Box
        sx={{
          maxWidth: 1200,
          flex: 2,
          padding: 1,
          backgroundColor: '#f9f9f9',
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography variant="h4" gutterBottom align="center">
          Profile Information
        </Typography>

        <Card sx={{ marginBottom: 1, px: 5, borderRadius: '20px' }}>
          <CardContent>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              sx={{ mb: 6 }}
            >
              <Typography variant="h4" fontWeight="bold" gutterBottom color={PRIMARY_COL}>
                Edit Profile
              </Typography>

              <Box display="flex" gap={2}>
                <Button
                  variant="outlined"
                  sx={{
                    borderRadius: '50px',
                    paddingX: 5,
                    paddingY: 1,
                    textTransform: 'none',
                  }}
                >
                  Cancel
                </Button>

                <Button
                  variant="contained"
                  sx={{
                    borderRadius: '50px',
                    paddingX: 5,
                    paddingY: 1,
                    textTransform: 'none',
                    bgcolor: '#806BE7',
                    color: 'white',
                  }}
                  onClick={handleSave}
                >
                  Save
                </Button>
              </Box>
            </Box>

            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', mb: '20px' }}
            >
              Personal Details
              <Box
                sx={{
                  flexGrow: 1,
                  height: '1px',
                  backgroundColor: '#cfd0d1',
                  marginLeft: 2,
                }}
              />
            </Typography>

            <Box display="flex" flexDirection="column">
              <Box display="flex" flexWrap="wrap" justifyContent="space-between" width="100%">
                <TextField
                  label="Full Name"
                  variant="standard"
                  fullWidth
                  sx={{ maxWidth: '350px', m: '30px 0 0' }}
                  value={profileData.name}
                  onChange={handleChange}
                  name="name"
                />

                <TextField
                  label="Designation"
                  variant="standard"
                  fullWidth
                  sx={{ maxWidth: '350px', m: '20px 0 0' }}
                  value={profileData.position}
                  onChange={handleChange}
                  name="position"
                />
              </Box>

              <Box display="flex" flexWrap="wrap" justifyContent="space-between" width="100%">
                <TextField
                  label="Email"
                  variant="standard"
                  fullWidth
                  sx={{ maxWidth: '350px', m: '20px 0 0' }}
                  type="email"
                  value={profileData.email}
                  onChange={handleChange}
                  name="email"
                />

                <TextField
                  label="Mobile"
                  variant="standard"
                  fullWidth
                  sx={{ maxWidth: '350px', m: '20px 0 0' }}
                  value={profileData.mobile}
                  onChange={handleChange}
                  name="mobile"
                  type="tel"
                />
              </Box>

              <Box display="flex" flexWrap="wrap" justifyContent="space-between" width="100%">
                <TextField
                  label="Alternate Mobile"
                  variant="standard"
                  fullWidth
                  sx={{ maxWidth: '350px', overflowX: 'auto', m: '20px 0 0' }}
                  value={profileData.altMobile}
                  onChange={handleChange}
                  name="altMobile"
                  type="tel"
                />
              </Box>
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                  Social Links
                </Typography>

                <Box display="flex" flexWrap="wrap" justifyContent="space-between">
                  {Object.entries(profileData.socialLinks || {})
                    .slice(0, Math.max(3, Object.keys(profileData.socialLinks || {}).length))
                    .map(([key, value]) => (
                      <TextField
                        key={key}
                        label={key.charAt(0).toUpperCase() + key.slice(1)}
                        variant="standard"
                        fullWidth
                        sx={{ maxWidth: '350px', m: '20px 0 0' }}
                        value={value || ''}
                        onChange={handleSocialLinksChange}
                        name={key}
                      />
                    ))}
                </Box>
              </Box>
            </Box>
          </CardContent>
          <Card sx={{ m: '30px 0' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                About Me
              </Typography>
              <TextField
                variant="outlined"
                fullWidth
                multiline
                rows={4}
                value={profileData.about}
                onChange={handleChange}
                name="about"
              />
            </CardContent>
          </Card>
        </Card>
        <OrganizationDetails data={profileData.organization} />
      </Box>
      <Box
        sx={{
          flex: 1,
          boxShadow: 3,
          borderRadius: 4,
        }}
      >
        <UserProfileCard type="recruiter" userData={profileData} showPortfolioLinks />
      </Box>
    </Box>
  );
};

const Profile = () => {
  return <JpLayoutWithSidebar role="recruiter">{<ProfileForm />}</JpLayoutWithSidebar>;
};

export default Profile;
