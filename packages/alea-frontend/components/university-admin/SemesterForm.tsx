import React, { useState, useEffect } from 'react';
import {
  Typography,
  Stack,
  Button,
  TextField,
  Paper,
  Alert,
  Snackbar,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import { createSemester, SemesterData } from 'packages/api/src/lib/university-admin-dashboard';

import { useRouter } from 'next/router';
import { getLocaleObject } from 'packages/alea-frontend/lang/utils';

interface SemesterFormProps {
  onSemesterCreated: (newSemesterId?: string) => void;
  currentSemester: string;
  universityId: string;
}

export const SemesterForm: React.FC<SemesterFormProps> = ({
  onSemesterCreated,
  currentSemester,
  universityId,
}) => {
  const [semForm, setSemForm] = useState<SemesterData>({
    universityId,
    instanceId: currentSemester,
    semesterStart: '',
    semesterEnd: '',
    lectureStartDate: '',
    lectureEndDate: '',
  });

  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

    const router = useRouter();
    const {universityAdmin: t} = getLocaleObject(router);

  useEffect(() => {
    setSemForm(prev => ({
      ...prev,
      instanceId: currentSemester,
    }));
  }, [currentSemester]);

  const handleSemFormChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setSemForm({ ...semForm, [name as string]: value });
  };

  const handleSaveSemester = async () => {
    setSaving(true);
    try {
      await createSemester(semForm);
      setSnackbar({
        open: true,
        message: t.semesterCreateSuccess,
        severity: 'success',
      });

      setSemForm({
        universityId,
        instanceId: currentSemester,
        semesterStart: '',
        semesterEnd: '',
        lectureStartDate: '',
        lectureEndDate: '',
      });

      onSemesterCreated(semForm.instanceId);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error?.response?.data?.message || t.semesterCreateFail,
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3, background: '#f9f9ff' }}>
      <Typography variant="h6" gutterBottom sx={{ color: 'primary.dark', fontWeight: 600 }}>
         {t.addSemesterDetail}
      </Typography>
      <Stack spacing={2}>
        <TextField
          label={t.universityId}
          name="universityId"
          value={semForm.universityId}
          disabled
          fullWidth
          required
        />

        <TextField
          label={t.instanceId}
          name="instanceId"
          value={semForm.instanceId}
          onChange={handleSemFormChange}
          fullWidth
          required
          placeholder="e.g., SS25, WS24-25"
        />

        <TextField
          label={t.semesterStart}
          name="semesterStart"
          type="date"
          value={semForm.semesterStart}
          onChange={handleSemFormChange}
          fullWidth
          InputLabelProps={{ shrink: true }}
          required
        />

        <TextField
          label={t.semesterEnd}
          name="semesterEnd"
          type="date"
          value={semForm.semesterEnd}
          onChange={handleSemFormChange}
          fullWidth
          InputLabelProps={{ shrink: true }}
          required
        />

        <TextField
          label={t.lectureStartDate}
          name="lectureStartDate"
          type="date"
          value={semForm.lectureStartDate}
          onChange={handleSemFormChange}
          fullWidth
          InputLabelProps={{ shrink: true }}
          required
        />

        <TextField
          label={t.lectureEndDate}
          name="lectureEndDate"
          type="date"
          value={semForm.lectureEndDate}
          onChange={handleSemFormChange}
          fullWidth
          InputLabelProps={{ shrink: true }}
          required
        />

        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveSemester}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Semester'}
        </Button>
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};
