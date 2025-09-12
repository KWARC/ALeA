import AddIcon from '@mui/icons-material/Add';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import type { AlertColor } from '@mui/material';
import {
  Alert,
  Button,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  deleteSingleHoliday,
  editHoliday,
  getHolidaysInfo,
  uploadHolidays,
} from '@stex-react/spec';
import React, { useEffect, useState } from 'react';

const convertToDDMMYYYY = (isoDate: string): string => {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', isoDate);
      return '';
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error converting date to DD/MM/YYYY:', error);
    return '';
  }
};

const convertFromDDMMYYYY = (ddmmyyyy: string): string => {
  if (!ddmmyyyy) return '';
  try {
    const [day, month, year] = ddmmyyyy.split('/');
    if (!day || !month || !year) {
      console.error('Invalid DD/MM/YYYY format:', ddmmyyyy);
      return '';
    }
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error converting from DD/MM/YYYY:', error);
    return '';
  }
};

interface Holiday {
  date: string;
  name: string;
  originalDate?: string; // Store the original DD/MM/YYYY format from database
}

interface HolidayManagementProps {
  universityId: string;
  instanceId: string;
  disabled?: boolean;
}

export const HolidayManagement: React.FC<HolidayManagementProps> = ({
  universityId,
  instanceId,
  disabled = false,
}) => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHoliday, setNewHoliday] = useState<Holiday>({ date: '', name: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<Holiday>({ date: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const hasHolidays = holidays.length > 0;
  const isAddingHoliday = !newHoliday.date || !newHoliday.name;
  const isEditing = editingIndex !== null;

  const fetchHolidays = async () => {
    try {
      const data = await getHolidaysInfo(universityId, instanceId);
      const convertedData = data
        .map((holiday) => {
          const convertedDate = convertFromDDMMYYYY(holiday.date);
          if (!convertedDate) {
            console.warn('Skipping holiday with invalid date:', holiday);
            return null;
          }
          return {
            ...holiday,
            date: convertedDate,
            originalDate: holiday.date, // Keep the original DD/MM/YYYY format from database
          };
        })
        .filter(Boolean) as Holiday[];

      // Sort ascending by ISO date (YYYY-MM-DD)
      convertedData.sort((a, b) => a.date.localeCompare(b.date));

      setHolidays(convertedData);
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
      setHolidays([]);
    }
  };

  useEffect(() => {
    if (universityId && instanceId) {
      fetchHolidays();
    }
  }, [universityId, instanceId]);

  const handleAddHoliday = async () => {
    if (isAddingHoliday) {
      setSnackbar({
        open: true,
        message: 'Please fill in both date and name',
        severity: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const convertedDate = convertToDDMMYYYY(newHoliday.date);
      if (!convertedDate) {
        setSnackbar({
          open: true,
          message: 'Invalid date format. Please select a valid date.',
          severity: 'error',
        });
        return;
      }

      const holidayForAPI = {
        ...newHoliday,
        date: convertedDate,
      };

      const holidayForLocalState = {
        ...newHoliday,
        date: newHoliday.date,
        originalDate: convertedDate,
      };

      let updatedHolidays = [...holidays, holidayForLocalState];
      // Keep local list sorted by ISO date
      updatedHolidays = [...updatedHolidays].sort((a, b) => a.date.localeCompare(b.date));
      // Ensure ALL holidays are sent as DD/MM/YYYY to the API
      const updatedHolidaysForAPI = updatedHolidays.map((h) => ({
        name: h.name,
        date: h.originalDate || convertToDDMMYYYY(h.date),
      }));

      await uploadHolidays({
        universityId,
        instanceId,
        holidays: updatedHolidaysForAPI,
      });

      setHolidays(updatedHolidays);
      setNewHoliday({ date: '', name: '' });
      setSnackbar({
        open: true,
        message: 'Holiday added successfully!',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error adding holiday:', error);
      setSnackbar({
        open: true,
        message: `Failed to add holiday: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoliday = async (index: number) => {
    setLoading(true);
    try {
      const holidayToDelete = holidays[index];
      const dateToDelete = holidayToDelete.originalDate || convertToDDMMYYYY(holidayToDelete.date);
      await deleteSingleHoliday({
        universityId,
        instanceId,
        dateToDelete,
      });
      const updatedHolidays = holidays
        .filter((_, i) => i !== index)
        .sort((a, b) => a.date.localeCompare(b.date));
      setHolidays(updatedHolidays);

      setSnackbar({
        open: true,
        message: 'Holiday deleted successfully!',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error deleting holiday:', error);
      setSnackbar({
        open: true,
        message: `Failed to delete holiday: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (index: number, holiday: Holiday) => {
    setEditingIndex(index);
    setEditingHoliday({ ...holiday });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingHoliday({ date: '', name: '' });
  };

  const handleSaveEdit = async () => {
    if (!editingHoliday.date || !editingHoliday.name) {
      setSnackbar({
        open: true,
        message: 'Please fill in both date and name',
        severity: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const originalHoliday = holidays[editingIndex!];
      const originalDateForAPI =
        originalHoliday.originalDate || convertToDDMMYYYY(originalHoliday.date);
      const updatedHolidayForAPI = {
        ...editingHoliday,
        date: convertToDDMMYYYY(editingHoliday.date),
      };

      await editHoliday({
        universityId,
        instanceId,
        originalDate: originalDateForAPI,
        updatedHoliday: updatedHolidayForAPI,
      });

      const updatedHolidays = [...holidays];
      // Keep originalDate in sync locally after successful edit
      updatedHolidays[editingIndex!] = {
        ...editingHoliday,
        originalDate: updatedHolidayForAPI.date,
      };
      // Sort after edit
      updatedHolidays.sort((a, b) => a.date.localeCompare(b.date));
      setHolidays(updatedHolidays);

      setEditingIndex(null);
      setEditingHoliday({ date: '', name: '' });

      setSnackbar({
        open: true,
        message: 'Holiday updated successfully!',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to update holiday',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Paper elevation={2} sx={{ p: 2, borderRadius: 3, background: '#fff' }}>
      <Typography variant="h6" gutterBottom sx={{ color: 'primary.dark', fontWeight: 600 }}>
        Holiday Management
      </Typography>

      <Paper elevation={1} sx={{ p: 2, mb: 2, background: '#f9f9ff' }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Add New Holiday
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Date"
            type="date"
            value={newHoliday.date}
            onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ minWidth: 150 }}
            disabled={disabled}
          />
          <TextField
            label="Holiday Name"
            value={newHoliday.name}
            onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
            size="small"
            sx={{ flexGrow: 1 }}
            disabled={disabled}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddHoliday}
            disabled={loading || isAddingHoliday || disabled}
            size="small"
          >
            Add
          </Button>
        </Stack>
      </Paper>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ background: '#e3f0ff' }}>
              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!hasHolidays ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No holidays found
                </TableCell>
              </TableRow>
            ) : (
              holidays.map((holiday, idx) => (
                <TableRow
                  key={idx}
                  sx={{
                    backgroundColor: idx % 2 === 0 ? '#f5f7fa' : '#e9eef6',
                    '&:hover': { backgroundColor: '#e3f0ff' },
                    transition: 'background 0.2s',
                  }}
                >
                  <TableCell>
                    {isEditing && editingIndex === idx ? (
                      <TextField
                        type="date"
                        value={editingHoliday.date}
                        onChange={(e) =>
                          setEditingHoliday({ ...editingHoliday, date: e.target.value })
                        }
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        sx={{ minWidth: 150 }}
                        disabled={disabled}
                      />
                    ) : (
                      holiday.date
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing && editingIndex === idx ? (
                      <TextField
                        value={editingHoliday.name}
                        onChange={(e) =>
                          setEditingHoliday({ ...editingHoliday, name: e.target.value })
                        }
                        size="small"
                        sx={{ minWidth: 200 }}
                        disabled={disabled}
                      />
                    ) : (
                      holiday.name
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing && editingIndex === idx ? (
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={handleSaveEdit}
                          disabled={loading || disabled}
                        >
                          <SaveIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="default"
                          onClick={handleCancelEdit}
                          disabled={loading || disabled}
                        >
                          <CancelIcon />
                        </IconButton>
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleStartEdit(idx, holiday)}
                          disabled={loading || disabled}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteHoliday(idx)}
                          disabled={loading || disabled}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};
