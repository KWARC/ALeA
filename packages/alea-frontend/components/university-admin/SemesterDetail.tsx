import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import type { AlertColor } from '@mui/material';
import {
  Alert,
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
  Typography
} from '@mui/material';
import { updateSemester } from '@stex-react/spec';
import React, { useState } from 'react';

interface SemesterData {
  semesterStart: string;
  semesterEnd: string;
  lectureStartDate: string;
  lectureEndDate: string;
}

interface SemesterDetailProps {
  semesters: SemesterData[];
  universityId: string;
  instanceId: string;
  onSemesterUpdated: () => void;
  disabled?: boolean;
}

export const SemesterDetail: React.FC<SemesterDetailProps> = ({
  semesters,
  universityId,
  instanceId,
  onSemesterUpdated,
  disabled = false,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingSemester, setEditingSemester] = useState<SemesterData>({
    semesterStart: '',
    semesterEnd: '',
    lectureStartDate: '',
    lectureEndDate: '',
  });
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

  // Derived state
  const hasSemesters = semesters.length > 0;
  const isEditing = editingIndex !== null;
  const isFormValid =
    editingSemester.semesterStart &&
    editingSemester.semesterEnd &&
    editingSemester.lectureStartDate &&
    editingSemester.lectureEndDate;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    // Handle timezone issues by using local date methods
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForAPI = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleStartEdit = (index: number, semester: SemesterData) => {
    setEditingIndex(index);
    setEditingSemester({ ...semester });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingSemester({
      semesterStart: '',
      semesterEnd: '',
      lectureStartDate: '',
      lectureEndDate: '',
    });
  };

  const handleSaveEdit = async () => {
    if (!isFormValid) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      await updateSemester({
        universityId,
        instanceId,
        semesterStart: formatDateForAPI(editingSemester.semesterStart),
        semesterEnd: formatDateForAPI(editingSemester.semesterEnd),
        lectureStartDate: formatDateForAPI(editingSemester.lectureStartDate),
        lectureEndDate: formatDateForAPI(editingSemester.lectureEndDate),
      });

      setEditingIndex(null);
      setEditingSemester({
        semesterStart: '',
        semesterEnd: '',
        lectureStartDate: '',
        lectureEndDate: '',
      });

      setSnackbar({
        open: true,
        message: 'Semester updated successfully!',
        severity: 'success',
      });

      onSemesterUpdated();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to update semester',
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
        Semester Detail
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ background: '#e3f0ff' }}>
              <TableCell sx={{ fontWeight: 600 }}>Semester Start</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Semester End</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Lecture Start</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Lecture End</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!hasSemesters ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No semester data
                </TableCell>
              </TableRow>
            ) : (
              semesters.map((detail, idx) => (
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
                        value={formatDateForInput(editingSemester.semesterStart)}
                        onChange={(e) =>
                          setEditingSemester({
                            ...editingSemester,
                            semesterStart: e.target.value,
                          })
                        }
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        sx={{ width: 120 }}
                      />
                    ) : (
                      formatDate(detail.semesterStart)
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing && editingIndex === idx ? (
                      <TextField
                        type="date"
                        value={formatDateForInput(editingSemester.semesterEnd)}
                        onChange={(e) =>
                          setEditingSemester({
                            ...editingSemester,
                            semesterEnd: e.target.value,
                          })
                        }
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        sx={{ width: 120 }}
                      />
                    ) : (
                      formatDate(detail.semesterEnd)
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing && editingIndex === idx ? (
                      <TextField
                        type="date"
                        value={formatDateForInput(editingSemester.lectureStartDate)}
                        onChange={(e) =>
                          setEditingSemester({
                            ...editingSemester,
                            lectureStartDate: e.target.value,
                          })
                        }
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        sx={{ width: 120 }}
                      />
                    ) : (
                      formatDate(detail.lectureStartDate)
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing && editingIndex === idx ? (
                      <TextField
                        type="date"
                        value={formatDateForInput(editingSemester.lectureEndDate)}
                        onChange={(e) =>
                          setEditingSemester({
                            ...editingSemester,
                            lectureEndDate: e.target.value,
                          })
                        }
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        sx={{ width: 120 }}
                      />
                    ) : (
                      formatDate(detail.lectureEndDate)
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing && editingIndex === idx ? (
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={handleSaveEdit}
                          disabled={loading}
                        >
                          <SaveIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="default"
                          onClick={handleCancelEdit}
                          disabled={loading}
                        >
                          <CancelIcon />
                        </IconButton>
                      </Stack>
                    ) : (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleStartEdit(idx, detail)}
                        disabled={loading || disabled}
                      >
                        <EditIcon />
                      </IconButton>
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
