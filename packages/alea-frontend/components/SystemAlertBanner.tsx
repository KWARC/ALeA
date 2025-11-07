import { getSystemAlert } from '@alea/spec';
import { Alert, AlertTitle, Box } from '@mui/material';
import { useEffect, useState } from 'react';

type AlertType = 'error' | 'warning' | 'info' | 'success';

export default function SystemAlertBanner() {
  const [message, setMessage] = useState<string | null>(null);
  const [severity, setSeverity] = useState<AlertType>('error');

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const res = await getSystemAlert();
        if (res?.message) {
          setMessage(res.message);
          setSeverity(res.severity || 'error');
        }
      } catch (err) {
        console.error('Error fetching system alert:', err);
      }
    };
    fetchBanner();
  }, []);

  if (!message) return null;

  return (
    <Box sx={{ width: '100%', mt: 1 }}>
      <Alert severity={severity} sx={{ borderRadius: 0 }}>
        <AlertTitle>System Notice</AlertTitle>
        {message}
      </Alert>
    </Box>
  );
}
