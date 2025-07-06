import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { Alert, Box, IconButton, Snackbar, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';

export function PersonalCalendarSection({
  userId,
  hintGoogle,
  hintApple,
}: {
  userId: string;
  hintGoogle: string;
  hintApple: string;
}) {
  const calendarURL = `https://courses.voll-ki.fau.de/api/calendar/create-calendar?userId=${userId}`;
  const [calendarLinkCopied, setCalendarLinkCopied] = useState(false);
  if (!userId) return null;
  return (
    <Box
      sx={{
        px: { xs: 1, sm: 2 },
        py: { xs: 1, sm: 1.5 },
        borderRadius: '8px',
        background: 'linear-gradient(135deg, #fff3e0, #e8f4fd)',
        border: '1px solid #ffcc02',
        cursor: 'pointer',
        '&:hover': {
          background: 'linear-gradient(135deg,rgb(255, 191, 87), #e8f4fd)',
        },
      }}
      onClick={() => {
        navigator.clipboard.writeText(calendarURL);
        setCalendarLinkCopied(true);
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarMonthIcon sx={{ fontSize: 20, color: '#1976d2' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2', fontSize: '1rem' }}>
            Copy Personal Calendar Link
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={hintGoogle}>
            <IconButton
              component="a"
              href="https://calendar.google.com/calendar/u/0/r"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                backgroundColor: '#fff',
                border: '1px solid #dadce0',
                borderRadius: '8px',
                width: 32,
                height: 32,
                '&:hover': { backgroundColor: '#f8f9fa' },
              }}
            >
              <Box
                component="img"
                src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/google/google-original.svg"
                alt="Google Calendar"
                sx={{ width: 18, height: 18 }}
              />
            </IconButton>
          </Tooltip>
          <Tooltip title={hintApple}>
            <IconButton
              sx={{
                backgroundColor: '#fff',
                border: '1px solid #dadce0',
                borderRadius: '8px',
                width: 32,
                height: 32,
                cursor: 'auto',
                '&:hover': { backgroundColor: '#f8f9fa' },
              }}
            >
              <Box
                component="img"
                src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/apple/apple-original.svg"
                alt="Apple Calendar"
                sx={{ width: 18, height: 18 }}
              />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Snackbar
        open={!!calendarLinkCopied}
        autoHideDuration={8000}
        onClose={() => setCalendarLinkCopied(false)}
      >
        <Alert severity="success">Calendar link copied to clipboard</Alert>
      </Snackbar>
    </Box>
  );
}
