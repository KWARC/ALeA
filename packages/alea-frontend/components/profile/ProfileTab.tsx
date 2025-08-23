import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import EditIcon from '@mui/icons-material/Edit';
import GradingIcon from '@mui/icons-material/Grading';
import InsightsIcon from '@mui/icons-material/Insights';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import SchoolIcon from '@mui/icons-material/School';
import { Box, Button, Card, Stack, Typography } from '@mui/material';
import { UserInfo, UserProfile } from '@stex-react/api';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getLocaleObject } from '../../lang/utils';
import { PersonalCalendarSection } from '../PersonalCalendar';
import { EditProfileDialog } from './EditProfileDialog';

export const ProfileTab = ({
  profileData,
  userInfo,
  setOpenEditDialog,
  openEditDialog,
  handleProfileUpdate,
}: {
  profileData: UserProfile | null;
  userInfo: UserInfo | null;
  setOpenEditDialog: (open: boolean) => void;
  openEditDialog: boolean;
  handleProfileUpdate: (updatedData: UserProfile) => void;
}) => {
  const { myProfile: t, calendarSection: c } = getLocaleObject(useRouter());
  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
      <Box sx={{ flex: '1 1 50%' }}>
        <Card variant="outlined">
          <Box
            sx={{
              p: 2,
              bgcolor: 'primary.light',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6">{t.personalInfo}</Typography>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => setOpenEditDialog(true)}
            >
              Edit
            </Button>
          </Box>
          <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper', boxShadow: 2 }}>
            {profileData ? (
              <Stack spacing={2}>
                {[
                  { label: t.firstName, value: profileData.firstName },
                  { label: t.lastName, value: profileData.lastName },
                  { label: t.email, value: profileData.email },
                  { label: t.studyProgram, value: profileData.studyProgram },
                  { label: t.semester, value: profileData.semester },
                  { label: t.languages, value: profileData.languages },
                ].map((field) => (
                  <Box key={field.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 'bold',
                        color: 'text.primary',
                        minWidth: 160,
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      {field.label} <span>:</span>
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.primary' }}>
                      {field.value || '-'}
                    </Typography>
                  </Box>
                ))}
                {userInfo?.userId && (
                  <Box sx={{ mt: 2 }}>
                    <PersonalCalendarSection
                      userId={userInfo.userId}
                      hintGoogle={c.howToUseHintGoogle}
                      hintApple={c.howToUseHintApple}
                    />
                  </Box>
                )}
              </Stack>
            ) : (
              <Typography sx={{ color: 'text.secondary' }}>Loading...</Typography>
            )}
          </Box>
        </Card>

        <EditProfileDialog
          open={openEditDialog}
          onClose={() => setOpenEditDialog(false)}
          profileData={profileData}
          userId={userInfo?.userId}
          onSave={handleProfileUpdate}
        />
      </Box>

      <Box sx={{ flex: '1 1 50%' }}>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <Box sx={{ p: 2, bgcolor: 'primary.light', color: 'white' }}>
            <Typography variant="h6">{t.dataAlea}</Typography>
          </Box>
          <Stack spacing={2} sx={{ p: 2 }}>
            <Link href="/my-notes" passHref>
              <Button variant="contained" fullWidth startIcon={<NoteAltIcon />}>
                {t.myNotes}
              </Button>
            </Link>
            <Link href="/my-learner-model" passHref>
              <Button variant="contained" fullWidth startIcon={<InsightsIcon />}>
                {t.myCompetencyData}
              </Button>
            </Link>
            <Link href="/my-answers" passHref>
              <Button variant="contained" fullWidth startIcon={<AssignmentTurnedInIcon />}>
                {t.myAnswers}
              </Button>
            </Link>
            <Link href="/my-grading" passHref>
              <Button variant="contained" fullWidth startIcon={<GradingIcon />}>
                {t.myGrading}
              </Button>
            </Link>
            <Link href="/learner-model-init" passHref>
              <Button variant="contained" fullWidth startIcon={<SchoolIcon />}>
                {t.learnerModelPriming}
              </Button>
            </Link>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
};
