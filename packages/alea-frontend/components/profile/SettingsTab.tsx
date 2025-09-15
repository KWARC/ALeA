import { Box, Button, Card, Paper, Switch, Typography } from '@mui/material';
import { ANON_USER_ID_PREFIX } from '@alea/spec';
import { PersonaChooser } from '../../pages/login';

export const SettingsTab = ({
  t,
  l,
  trafficLightStatus,
  sectionReviewStatus,
  userInfo,
  persona,
  isVerifiedUser,
  handleTrafficLight,
  handleSectionReviewStatus,
  handleVerification,
  setPresetProfileName,
  resetFakeUserData,
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
      <Box sx={{ flex: '1 1 50%' }}>
        <Card variant="outlined">
          <Box sx={{ p: 2, bgcolor: 'primary.light', color: 'white' }}>
            <Typography variant="h6">{t.displaySettings}</Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography fontWeight="medium">Show Traffic Light on Notes</Typography>
              <Switch
                checked={trafficLightStatus}
                onChange={() => handleTrafficLight(!trafficLightStatus)}
                color="primary"
              />
            </Paper>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: 2,
              }}
            >
              <Typography fontWeight="medium">Show Review Section on Notes</Typography>
              <Switch
                checked={sectionReviewStatus}
                onChange={() => handleSectionReviewStatus(!sectionReviewStatus)}
                color="primary"
              />
            </Paper>
          </Box>
        </Card>
      </Box>
      {userInfo?.userId?.startsWith('fake_') && (
        <Box sx={{ flex: '1 1 50%' }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <Box sx={{ p: 2, bgcolor: 'primary.light', color: 'white' }}>
              <Typography variant="h6">{t.accountInformation}</Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Test Account Settings
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <PersonaChooser
                    label={t.choosePersona}
                    persona={persona}
                    onPersonaUpdate={(l) => {
                      setPresetProfileName(l);
                    }}
                  />
                  <Button
                    disabled={!persona?.length}
                    variant="contained"
                    size="small"
                    onClick={() => resetFakeUserData(persona)}
                    sx={{ ml: 2 }}
                  >
                    {t.resetFake}
                  </Button>
                </Box>
              </Box>

              <Typography variant="body1">
                Account Type:{' '}
                <strong>
                  {userInfo.userId.startsWith(ANON_USER_ID_PREFIX) ? 'Anonymous' : 'Registered'}
                </strong>
              </Typography>

              {!isVerifiedUser && !userInfo.userId.startsWith(ANON_USER_ID_PREFIX) && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                  <Typography>{l.verifcationMessage}</Typography>
                </Box>
              )}
            </Box>
          </Card>
        </Box>
      )}
    </Box>
  );
};
