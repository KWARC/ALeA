import { Alert, AlertTitle, Box } from '@mui/material';
import { useEffect, useState } from 'react';
import axios from 'axios';

type AlertType = 'error' | 'warning' | 'info' | 'success';

export default function SystemAlertBanner() {
  const [message, setMessage] = useState<string | null>(null);
  const [severity, setSeverity] = useState<AlertType>('error');

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const res = await axios.get('/api/system-alert/get');
        if (res.data?.message) {
          setMessage(res.data.message);
          setSeverity(res.data.severity || 'error');
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
