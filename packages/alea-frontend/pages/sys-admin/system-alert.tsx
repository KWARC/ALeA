import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import axios from 'axios';

type AlertType = 'info' | 'warning' | 'error';
type MonitorJSON = Record<string, any>;

const SysAdminSystemAlertPage: NextPage = () => {
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertType>('info');
  const [monitor, setMonitor] = useState<MonitorJSON>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [alertRes, monitorRes] = await Promise.all([
          axios.get('/api/system-alert/get'),
          axios.get('/api/sys-admin/monitor-message'),
        ]);

        if (alertRes.data) {
          setMessage(alertRes.data.message || '');
          setSeverity(alertRes.data.severity || 'info');
        }

        if (monitorRes.data) {
          setMonitor(monitorRes.data.monitor || {});
        }
      } catch (err: any) {
        console.error(err);
        setError('Failed to load data. Make sure you are authorized.');
         } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.post('/api/system-alert/update', { message, severity });
      setSuccess('Alert updated successfully!');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to save alert');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        System Alert Administration
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Current System Alert
        </Typography>

        <TextField
          label="Message"
          fullWidth
          multiline
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          label="Severity (info, warning, error)"
          fullWidth
          value={severity}
          onChange={(e) => setSeverity(e.target.value as AlertType)}
          sx={{ mb: 2 }}
        />

        <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Update Alert'}
        </Button>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Current Monitor Status
        </Typography>
        <pre>{JSON.stringify(monitor, null, 2)}</pre>
      </Paper>

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      {success && (
        <Typography color="success.main" sx={{ mt: 2 }}>
          {success}
        </Typography>
      )}
    </Box>
  );
};

export default SysAdminSystemAlertPage;
