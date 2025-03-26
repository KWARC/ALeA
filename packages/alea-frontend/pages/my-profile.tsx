import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DownloadIcon from '@mui/icons-material/Download';
import EmailIcon from '@mui/icons-material/Email';
import SettingsIcon from '@mui/icons-material/Settings';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { Avatar, Box, Button, Container, Paper, Tab, Tabs, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

import {
  ANON_USER_ID_PREFIX,
  getUserInfo,
  getUserInformation,
  getUserProfile,
  purgeAllMyData,
  purgeComments,
  purgeStudyBuddyData,
  purgeUserNotifications,
  resetFakeUserData,
  sendVerificationEmail,
  updateSectionReviewStatus,
  updateTrafficLightStatus,
} from '@stex-react/api';
import { PRIMARY_COL } from '@stex-react/utils';
import { useRouter } from 'next/router';
import { getLocaleObject } from '../lang/utils';
import MainLayout from '../layouts/MainLayout';

import { DataExportTab } from '../components/profile/DataExportTab';
import { ProfileTab } from '../components/profile/ProfileTab';
import { SettingsTab } from '../components/profile/SettingsTab';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MyProfilePage = () => {
  const router = useRouter();
  const { myProfile: t, logInSystem: l } = getLocaleObject(router);
  const [userInfo, setUserInfo] = useState(undefined);
  const [persona, setPresetProfileName] = useState('Blank');
  const [trafficLightStatus, setTrafficLightStatus] = useState(false);
  const [sectionReviewStatus, setSectionReviewStatus] = useState(false);
  const [isVerifiedUser, setIsVerifiedUser] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [profileData, setProfileData] = useState(null);
  const [isProfileUpdated, setIsProfileUpdated] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);

  useEffect(() => {
    getUserInfo().then((info) => {
      if (!info) {
        router.push('/login');
        return;
      }
      setUserInfo(info);
    });
  }, [router]);

  useEffect(() => {
    getUserInformation().then((res) => {
      setTrafficLightStatus(res.showTrafficLight);
      setSectionReviewStatus(res.showSectionReview);
      setIsVerifiedUser(res.isVerified);
    });
  }, []);

  useEffect(() => {
    if (tabValue === 0 && (profileData === null || isProfileUpdated)) {
      getUserProfile()
        .then((data) => {
          setProfileData(data);
          setIsProfileUpdated(false);
        })
        .catch((err) => {
          console.error('Error fetching profile data:', err);
          setProfileData({ error: 'Failed to load profile information' });
        });
    }
  }, [tabValue, profileData, isProfileUpdated]);

  async function handleTrafficLight(trafficLightStatus) {
    try {
      await updateTrafficLightStatus(trafficLightStatus);
      setTrafficLightStatus(trafficLightStatus);
    } catch (error) {
      console.error('Error updating traffic light status:', error);
    }
  }

  async function handleSectionReviewStatus(sectionReviewStatus) {
    try {
      await updateSectionReviewStatus(sectionReviewStatus);
      setSectionReviewStatus(sectionReviewStatus);
    } catch (error) {
      console.error('Error updating section review status:', error);
    }
  }

  async function handleVerification(userId) {
    try {
      await sendVerificationEmail(userId, crypto.randomUUID());
      alert(l.verificationEmail);
    } catch (error) {
      alert(l.somethingWentWrong);
      console.error('Error in sending verification email:', error);
    }
  }

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleProfileUpdate = (updatedData) => {
    setProfileData((prev) => ({
      ...prev,
      ...updatedData,
    }));
    setIsProfileUpdated(true);
  };

  if (!userInfo) return null;

  return (
    <MainLayout title={`${userInfo.fullName} | ALeA`}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box
            sx={{
              p: 4,
              bgcolor: PRIMARY_COL,
              color: 'white',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'center', sm: 'flex-start' },
              gap: 3,
            }}
          >
            <Avatar
              sx={{
                width: 100,
                height: 100,
                fontSize: '2.5rem',
                bgcolor: 'white',
                color: PRIMARY_COL,
              }}
            >
              {userInfo.fullName.charAt(0)}
            </Avatar>

            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" fontWeight="bold">
                {userInfo.fullName}
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.9, mb: 1 }}>
                {userInfo.userId}
              </Typography>

              {!isVerifiedUser && !userInfo.userId.startsWith(ANON_USER_ID_PREFIX) && (
                <Button
                  onClick={() => handleVerification(userInfo.userId)}
                  variant="contained"
                  color="secondary"
                  size="small"
                  startIcon={<EmailIcon />}
                  sx={{ mt: 1 }}
                >
                  {l.sendVerifcationBtn}
                </Button>
              )}

              {isVerifiedUser && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <VerifiedUserIcon color="success" />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    Verified Account
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="profile tabs"
            >
              <Tab icon={<AccountCircleIcon />} iconPosition="start" label={t.profile} />
              <Tab icon={<SettingsIcon />} iconPosition="start" label={t.Settings} />
              <Tab icon={<DownloadIcon />} iconPosition="start" label={t.dataExport} />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <ProfileTab
              t={t}
              profileData={profileData}
              userInfo={userInfo}
              setOpenEditDialog={setOpenEditDialog}
              openEditDialog={openEditDialog}
              handleProfileUpdate={handleProfileUpdate}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <SettingsTab
              t={t}
              l={l}
              trafficLightStatus={trafficLightStatus}
              sectionReviewStatus={sectionReviewStatus}
              userInfo={userInfo}
              persona={persona}
              isVerifiedUser={isVerifiedUser}
              handleTrafficLight={handleTrafficLight}
              handleSectionReviewStatus={handleSectionReviewStatus}
              handleVerification={handleVerification}
              setPresetProfileName={setPresetProfileName}
              resetFakeUserData={resetFakeUserData}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <DataExportTab
              t={t}
              userInfo={userInfo}
              purgeAllMyData={purgeAllMyData}
              purgeComments={purgeComments}
              purgeUserNotifications={purgeUserNotifications}
              purgeStudyBuddyData={purgeStudyBuddyData}
            />
          </TabPanel>
        </Paper>
      </Container>
    </MainLayout>
  );
};

export default MyProfilePage;
