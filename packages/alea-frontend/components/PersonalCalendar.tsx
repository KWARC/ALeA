import { createAndGetSecret, refreshCalendarSecret } from '@alea/spec';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { useRouter } from 'next/router';
import { useId, useState } from 'react';
import { getLocaleObject } from '../lang/utils';

const providerButtonSx = {
  backgroundColor: 'white',
  border: 1,
  borderColor: 'divider',
  borderRadius: 2,
  boxSizing: 'border-box',
  width: 32,
  height: 32,
  '&:hover': { backgroundColor: 'grey.50' },
};

export function PersonalCalendarSection() {
  const { calendarSection: t } = getLocaleObject(useRouter());
  const theme = useTheme();
  const dialogTitle = useId();
  const dialogDescription = useId();
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manualLink, setManualLink] = useState('');
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; message: string }>();

  async function copyCalendarLink() {
    setBusy(true);
    setManualLink('');
    setFeedback(undefined);
    try {
      const { calendarSecret } = await createAndGetSecret();
      if (typeof calendarSecret !== 'string') throw new Error('Missing calendar code');
      const url = new URL('/api/calendar/create-calendar', window.location.origin);
      url.searchParams.set('calendarSecret', calendarSecret);
      const link = url.toString();
      try {
        await navigator.clipboard.writeText(link);
        setFeedback({ severity: 'success', message: t.calendarLinkCopied });
      } catch {
        setManualLink(link);
      }
    } catch {
      setFeedback({ severity: 'error', message: t.calendarLinkError });
    } finally {
      setBusy(false);
    }
  }

  async function refreshCalendarCode() {
    setConfirmRefresh(false);
    setBusy(true);
    setFeedback(undefined);
    try {
      const { calendarSecret } = await refreshCalendarSecret();
      if (typeof calendarSecret !== 'string') throw new Error('Missing calendar code');
      setManualLink('');
      setFeedback({ severity: 'success', message: t.calendarCodeRefreshed });
    } catch {
      setFeedback({ severity: 'error', message: t.calendarRefreshError });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        px: { xs: 1, sm: 2 },
        py: { xs: 1, sm: 1.5 },
        borderRadius: '8px',
        background: theme.palette.gradients?.softHighlight,
        border: `1px solid ${theme.palette.warning[400]}`,
        '&:hover': { background: theme.palette.gradients?.warmHighlight },
      }}
    >
      <Stack direction="row" spacing={1} useFlexGap alignItems="center" flexWrap="wrap">
        <ButtonBase
          onClick={copyCalendarLink}
          disabled={busy}
          sx={{
            gap: 1,
            textAlign: 'left',
            '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' },
            '&.Mui-disabled': { opacity: 0.5 },
          }}
        >
          <CalendarMonthIcon sx={{ fontSize: 20, color: 'blue.sky', flexShrink: 0 }} />
          <Typography
            component="span"
            variant="h6"
            sx={{ fontWeight: 600, color: 'blue.sky', fontSize: '1rem' }}
          >
            {t.copyPersonalCalendarLink}
          </Typography>
        </ButtonBase>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title={t.howToUseHintGoogle} describeChild>
            <IconButton
              component="a"
              href="https://calendar.google.com/calendar/u/0/r"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Google Calendar"
              sx={providerButtonSx}
            >
              <Box
                component="img"
                src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/google/google-original.svg"
                alt=""
                sx={{ width: 18, height: 18 }}
              />
            </IconButton>
          </Tooltip>
          <Tooltip title={t.howToUseHintApple} describeChild>
            <Box
              tabIndex={0}
              role="img"
              aria-label="Apple Calendar"
              sx={{ ...providerButtonSx, display: 'grid', placeItems: 'center' }}
            >
              <Box
                component="img"
                src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/apple/apple-original.svg"
                alt=""
                sx={{ width: 18, height: 18 }}
              />
            </Box>
          </Tooltip>
        </Stack>

        <Tooltip title={busy ? '' : t.calendarRefreshConfirmation} describeChild>
          <Button
            onClick={() => setConfirmRefresh(true)}
            disabled={busy}
            size="small"
            sx={{ ml: 'auto' }}
          >
            {t.refreshCalendarCode}
          </Button>
        </Tooltip>
      </Stack>
      {manualLink && (
        <TextField
          data-sentry-block
          fullWidth
          size="small"
          sx={{ mt: 1 }}
          label={t.personalCalendar}
          helperText={t.calendarManualCopy}
          value={manualLink}
          slotProps={{ input: { readOnly: true } }}
          onFocus={(event) => event.target.select()}
        />
      )}
      <Dialog
        open={confirmRefresh}
        onClose={() => setConfirmRefresh(false)}
        aria-labelledby={dialogTitle}
        aria-describedby={dialogDescription}
      >
        <DialogTitle id={dialogTitle}>{t.refreshCalendarCode}</DialogTitle>
        <DialogContent>
          <DialogContentText id={dialogDescription}>
            {t.calendarRefreshConfirmation}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button autoFocus onClick={() => setConfirmRefresh(false)}>
            {t.cancelCalendarRefresh}
          </Button>
          <Button onClick={refreshCalendarCode}>{t.refreshCalendarCode}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!feedback} autoHideDuration={8000} onClose={() => setFeedback(undefined)}>
        {feedback && <Alert severity={feedback.severity}>{feedback.message}</Alert>}
      </Snackbar>
    </Box>
  );
}
