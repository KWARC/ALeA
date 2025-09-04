import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import { Box, Button, Card, Dialog, Stack, Typography } from '@mui/material';
import { useState } from 'react';

import { getAllMyComments, getAllMyData } from '@stex-react/spec';
import { downloadFile } from '@stex-react/utils';
import { ConfirmPurgeDialogContent } from './ConfirmPurgeDialogContent';

export const DataExportTab = ({
  t,
  userInfo,
  purgeAllMyData,
  purgeComments,
  purgeUserNotifications,
  purgeStudyBuddyData,
}) => {
  const [openPurgeDialog, setOpenPurgeDialog] = useState(false);

  async function handleDataPurge(confirmed) {
    if (!confirmed) {
      setOpenPurgeDialog(false);
      return;
    }
    try {
      await purgeAllMyData();
      await purgeComments();
      await purgeUserNotifications();
      await purgeStudyBuddyData();
      alert(t.dataPurged);
      setOpenPurgeDialog(false);
    } catch (err) {
      console.log(err);
      alert(t.purgeError);
    }
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        <Box sx={{ flex: '1 1 50%' }}>
          <Card variant="outlined">
            <Box sx={{ p: 2, bgcolor: 'primary.light', color: 'white' }}>
              <Typography variant="h6">{t.downloadData}</Typography>
            </Box>
            <Stack spacing={2} sx={{ p: 3 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => {
                  getAllMyComments().then((data) => {
                    downloadFile(
                      JSON.stringify(data, undefined, 2),
                      `${userInfo.userId}-comments-${Date.now()}.json`,
                      'text/json'
                    );
                  });
                }}
                fullWidth
              >
                {t.downloadNotes}
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => {
                  getAllMyData().then((data) => {
                    downloadFile(
                      JSON.stringify(data, undefined, 2),
                      `${userInfo.userId}-lms-${Date.now()}.json`,
                      'text/json'
                    );
                  });
                }}
                fullWidth
              >
                {t.downloadProfile}
              </Button>
            </Stack>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 50%' }}>
          <Card variant="outlined" sx={{ border: '1px solid rgba(255,0,0,0.2)' }}>
            <Box sx={{ p: 2, bgcolor: 'error.light', color: 'white' }}>
              <Typography variant="h6">{t.dataDeletion}</Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                Warning: This action cannot be undone. All your data will be permanently deleted.
              </Typography>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setOpenPurgeDialog(true)}
                fullWidth
              >
                {t.purgeData}
              </Button>
            </Box>
          </Card>
        </Box>
      </Box>

      <Dialog
        onClose={() => setOpenPurgeDialog(false)}
        open={openPurgeDialog}
        maxWidth="sm"
        fullWidth
      >
        <ConfirmPurgeDialogContent onClose={handleDataPurge} />
      </Dialog>
    </>
  );
};
