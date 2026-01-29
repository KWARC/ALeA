import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import { canAccessResource, getStudentProfile, updateStudentProfile } from '@alea/spec';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { UserProfileCard } from '../../../components/job-portal/UserProfileCard';
import JpLayoutWithSidebar from '../../../layouts/JpLayoutWithSidebar';

const ProfileForm = () => {
  const [profileData, setProfileData] = useState({
    name: '',
    userId: '',
    email: '',
    mobile: '',
    altMobile: '',
    about: '',
    courses: '',
    location: '',
    gpa: '',
    programme: '',
    yearOfAdmission: '',
    yearOfGraduation: '',
    socialLinks: {},
    resumeUrl: '',
  });

  const [accessCheckLoading, setAccessCheckLoading] = useState(true);
  const [loading, setLoading] = useState(true);
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
        const parsedSocialLinks = res?.socialLinks || {};
        const requiredSocialLinks = {
          linkedin: parsedSocialLinks.linkedin || 'N/A',
          github: parsedSocialLinks.github || 'N/A',
          twitter: parsedSocialLinks.twitter || 'N/A',
          ...parsedSocialLinks,
        };
        setProfileData((prevData) => ({
          ...prevData,
          name: res?.name || '',
          userId: res?.userId || '',
          email: res?.email || '',
          mobile: res?.mobile || '',
          altMobile: res?.mobile || '',
          about: res?.about || '',
          courses: res?.courses || '',
          location: res?.location || '',
          gpa: res?.gpa || '',
          programme: res?.programme || '',
          yearOfAdmission: res?.yearOfAdmission || '',
          yearOfGraduation: res?.yearOfGraduation || '',
          socialLinks: requiredSocialLinks,
          resumeUrl: res?.resumeUrl || '',
        }));
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, [accessCheckLoading]);

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
        gpa: profileData.gpa,
        courses: profileData.courses,
        programme: profileData.programme,
        yearOfAdmission: profileData.yearOfAdmission,
        yearOfGraduation: profileData.yearOfGraduation,
        resumeUrl: profileData.resumeUrl,
        location: profileData.location,
        about: profileData.about,
        socialLinks: JSON.stringify(profileData.socialLinks),
      };

      await updateStudentProfile(updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };
  if (accessCheckLoading || loading) {
    return <CircularProgress color="primary" />;
  }
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
              <Typography variant="h4" fontWeight="bold" gutterBottom color={'primary.main'}>
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
                  sx={{ maxWidth: '350px', m: '20px 0 0' }}
                  value={profileData.altMobile}
                  onChange={handleChange}
                  name="altMobile"
                  type="tel"
                />
                <TextField
                  label="Courses"
                  variant="standard"
                  fullWidth
                  sx={{ maxWidth: '350px', m: '20px 0 0' }}
                  value={profileData.courses}
                  onChange={handleChange}
                  name="courses"
                />
              </Box>

              <Box display="flex" flexWrap="wrap" justifyContent="space-between" width="100%">
                <TextField
                  label="Programme"
                  variant="standard"
                  fullWidth
                  sx={{ maxWidth: '350px', m: '20px 0 0' }}
                  value={profileData.programme}
                  onChange={handleChange}
                  name="programme"
                />
                <TextField
                  label="GPA"
                  variant="standard"
                  fullWidth
                  sx={{ maxWidth: '350px', m: '20px 0 0' }}
                  value={profileData.gpa}
                  onChange={handleChange}
                  name="gpa"
                />
              </Box>

              <Box display="flex" flexWrap="wrap" justifyContent="space-between" width="100%">
                <TextField
                  label="Location"
                  variant="standard"
                  fullWidth
                  sx={{ maxWidth: '350px', m: '20px 0 0' }}
                  value={profileData.location}
                  onChange={handleChange}
                  name="location"
                />
                <TextField
                  label="Year Of Admission"
                  variant="standard"
                  fullWidth
                  sx={{ maxWidth: '350px', m: '20px 0 0' }}
                  value={profileData.yearOfAdmission}
                  onChange={handleChange}
                  name="yearOfAdmission"
                />
              </Box>

              <Box display="flex" flexWrap="wrap" justifyContent="space-between" width="100%">
                <TextField
                  label="Year Of Graduation"
                  variant="standard"
                  fullWidth
                  sx={{ maxWidth: '350px', m: '20px 0 0' }}
                  value={profileData.yearOfGraduation}
                  onChange={handleChange}
                  name="yearOfGraduation"
                />
                <TextField
                  label="Resume Url"
                  variant="standard"
                  fullWidth
                  sx={{ maxWidth: '350px', m: '20px 0 0' }}
                  value={profileData.resumeUrl}
                  onChange={handleChange}
                  name="resumeUrl"
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
      </Box>
      <Box
        sx={{
          flex: 1,
          boxShadow: 3,
          borderRadius: 4,
        }}
      >
        <UserProfileCard type="student" userData={profileData} showPortfolioLinks />;
      </Box>
    </Box>
  );
};
const Profile = () => {
  return (
    <JpLayoutWithSidebar
      role="student"
      title="Profile | Job Portal - ALeA"
      description="View and update your profile details on the ALeA Job Portal"
    >
      {<ProfileForm />}
    </JpLayoutWithSidebar>
  );
};
export default Profile;
