import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import MainLayout from '../../../alea-frontend/layouts/MainLayout';
import { getSystemAlert, updateSystemAlert, getMonitorStatus, AlertSeverity } from '@alea/spec';

interface EndpointStatus {
  last_success_time?: number;
  last_failure_time?: number;
  last_alert_time?: number;
  current_error?: string | null;
}
type MonitorJSON = Record<string, EndpointStatus>;

const SysAdminSystemAlertPage: NextPage = () => {
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertSeverity>('info');
  const [monitor, setMonitor] = useState<MonitorJSON>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [alertRes, monitorRes] = await Promise.all([getSystemAlert(), getMonitorStatus()]);

        if (alertRes) {
          setMessage(alertRes.message || '');
          setSeverity(alertRes.severity || 'info');
        }

        if (monitorRes) {
          setMonitor(monitorRes.monitor || {});
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
      await updateSystemAlert({ message, severity });
      setSuccess('✅ Alert updated successfully!');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || '❌ Failed to save alert');
    } finally {
      setSaving(false);
    }
  };

  const handleClearAlert = async () => {
    setMessage('');
    setSeverity('info');
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateSystemAlert({ message: '', severity: 'info' });
      setSuccess('✅ Alert cleared!');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || '❌ Failed to clear alert');
    } finally {
      setSaving(false);
    }
  };

  // Downtime = current_time - last_success_time
  const formatDowntime = (lastSuccessSec?: number) => {
    if (!lastSuccessSec) return '—';
    const diffSec = Math.floor(Date.now() / 1000 - lastSuccessSec);
    if (diffSec < 60) return `${diffSec}s ago`;
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    const remMin = mins % 60;
    return `${hours} hr${remMin ? ` ${remMin} min` : ''} ago`;
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <MainLayout>
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          System Alert Page
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

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="severity-label">Severity</InputLabel>
            <Select
              labelId="severity-label"
              value={severity}
              label="Severity"
              onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
              disabled={message.trim() === ''}
            >
              <MenuItem value="info">Info</MenuItem>
              <MenuItem value="warning">Warning</MenuItem>
              <MenuItem value="error">Error</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Update Alert'}
            </Button>

            <Button
              variant="outlined"
              color="error"
              onClick={() => setConfirmClearOpen(true)}
              disabled={saving}
            >
              Clear Alert
            </Button>
          </Box>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Current Monitor Status
          </Typography>

          {Object.keys(monitor).length === 0 ? (
            <Typography>No monitor data available.</Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Endpoint</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Last Success</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Last Failure</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Status</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(monitor).map(([name, data]) => {
                    const ls = data.last_success_time ?? 0;
                    const lf = data.last_failure_time ?? 0;
                    const isUp = ls > lf;

                    const successTime = ls ? new Date(ls * 1000).toLocaleString() : '—';
                    const failureTime = lf ? new Date(lf * 1000).toLocaleString() : '—';

                    return (
                      <TableRow key={name}>
                        <TableCell>{name}</TableCell>
                        <TableCell>{successTime}</TableCell>
                        <TableCell>{failureTime}</TableCell>
                        <TableCell>{isUp ? <>✅</> : <>❌ ↓ {formatDowntime(ls)}</>}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
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

        <Dialog open={confirmClearOpen} onClose={() => setConfirmClearOpen(false)}>
          <DialogTitle>Clear System Alert?</DialogTitle>

          <DialogContent>
            <Typography>This will remove the alert banner from the entire site.</Typography>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setConfirmClearOpen(false)}>Cancel</Button>

            <Button
              color="error"
              onClick={() => {
                setConfirmClearOpen(false);
                handleClearAlert();
              }}
            >
              Clear Alert
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
};

export default SysAdminSystemAlertPage;
