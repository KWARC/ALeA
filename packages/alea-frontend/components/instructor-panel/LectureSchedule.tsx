import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Paper,
  Tooltip,
  CircularProgress,
  MenuItem,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import {
  LectureSchedule,
  getLectureEntry,
  updateLectureEntry,
  deleteLectureEntry,
  addLectureSchedule,
  updateHasHomework,
  updateHasQuiz,
} from '@stex-react/spec';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { getLocaleObject } from '../../lang/utils';

interface LectureScheduleTabProps {
  courseId: string;
  instanceId: string;
}

const initialNewEntry: LectureSchedule = {
  lectureDay: '',
  lectureStartTime: '',
  lectureEndTime: '',
  venue: '',
  venueLink: '',
  hasQuiz: false,
};

const LectureScheduleTab: React.FC<LectureScheduleTabProps> = ({ courseId, instanceId }) => {
  const router = useRouter();
  const { courseMetadata: t } = getLocaleObject(router);
  const weekdayOptions = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  const [lectures, setLectures] = useState<LectureSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasHomework, setHasHomework] = useState<boolean>(false);
  const [hasQuiz, setHasQuiz] = useState<boolean>(false);
  const [editEntry, setEditEntry] = useState<LectureSchedule | null>(null);
  const [editKeys, setEditKeys] = useState<{
    lectureDay: string;
    lectureStartTime: string;
    lectureEndTime: string;
  } | null>(null);
  const [newEntry, setNewEntry] = useState<LectureSchedule>(initialNewEntry);

  const fetchLectures = useCallback(async () => {
    try {
      const data = await getLectureEntry({ courseId, instanceId });
      setLectures(data.lectureSchedule || []);
      setHasHomework(!!data.hasHomework);
    } catch (err) {
      if (err.response?.status === 404) {
        console.warn('No lectures found for this course instance');
        setLectures([]);
      } else {
        console.error('Failed to fetch lectures', err);
      }
    } finally {
      setLoading(false);
    }
  }, [courseId, instanceId, t]);

  useEffect(() => {
    fetchLectures();
  }, [fetchLectures]);

  const handleDelete = async (lecture: LectureSchedule) => {
    if (!confirm(t.confirmDelete)) return;
    try {
      await deleteLectureEntry({
        courseId,
        instanceId,
        lectureEntry: lecture,
      });
      setLectures((prev) =>
        prev.filter(
          (l) =>
            !(
              l.lectureDay === lecture.lectureDay &&
              l.lectureStartTime === lecture.lectureStartTime &&
              l.lectureEndTime === lecture.lectureEndTime &&
              l.venue === lecture.venue &&
              l.venueLink === lecture.venueLink &&
              l.hasQuiz === lecture.hasQuiz
            )
        )
      );
    } catch (err) {
      console.error('Failed to delete lecture', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editEntry || !editKeys) return;
    if (!editEntry.lectureDay || !editEntry.lectureStartTime || !editEntry.lectureEndTime) {
      alert(t.requiredFieldsAlert);
      return;
    }
    try {
      await updateLectureEntry({
        courseId,
        instanceId,
        lectureDay: editKeys.lectureDay,
        lectureStartTime: editKeys.lectureStartTime,
        lectureEndTime: editKeys.lectureEndTime,
        updatedLectureEntry: { ...editEntry },
      });
      setEditEntry(null);
      setEditKeys(null);
      fetchLectures();
    } catch (err) {
      console.error('Failed to update lecture', err);
    }
  };

  const handleSaveNew = async () => {
    if (!newEntry.lectureDay || !newEntry.lectureStartTime || !newEntry.lectureEndTime) {
      alert(t.requiredFieldsAlert);
      return;
    }
    try {
      await addLectureSchedule({
        courseId,
        instanceId,
        lectureEntry: newEntry,
      });
      setNewEntry(initialNewEntry);
      fetchLectures();
    } catch (err) {
      console.error('Failed to add lecture', err);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress color="primary" />
      </Box>
    );

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
      <Typography variant="h6" fontWeight="bold" color="primary" mb={2}>
        {t.title.replace('{{courseId}}', courseId)}
      </Typography>
      <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <FormControlLabel
            labelPlacement="start"
            control={
              <Checkbox
                checked={hasHomework}
                onChange={async (e) => {
                  const next = e.target.checked;
                  if (!confirm('Are you sure to update homework availability?')) {
                    return;
                  }
                  try {
                    await updateHasHomework({ courseId, instanceId, hasHomework: next });
                    setHasHomework(next);
                  } catch (err) {
                    console.error('Failed to update homework availability', err);
                  }
                }}
              />
            }
            label={t.isHomeworkAvailable}
            sx={{ m: 0 }}
          />
          <FormControlLabel
            labelPlacement="start"
            control={
              <Checkbox
                checked={hasQuiz}
                onChange={async (e) => {
                  const next = e.target.checked;
                  if (!confirm('Are you sure to update quiz availability?')) {
                    return;
                  }
                  try {
                    await updateHasQuiz({ courseId, instanceId, hasQuiz: next });
                    setHasQuiz(next);
                  } catch (err) {
                    console.error('Failed to update quiz availability', err);
                  }
                }}
              />
            }
            label={'Enable quiz for this course'}
            sx={{ m: 0 }}
          />
        </Box>
      </Paper>
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <TextField
            select
            label={t.day}
            value={newEntry.lectureDay}
            onChange={(e) => setNewEntry((prev) => ({ ...prev, lectureDay: e.target.value }))}
            size="small"
            sx={{ width: 140 }}
          >
            {weekdayOptions.map((day) => (
              <MenuItem key={day} value={day}>
                {day}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t.venue}
            value={newEntry.venue}
            onChange={(e) => setNewEntry((prev) => ({ ...prev, venue: e.target.value }))}
            size="small"
            sx={{ width: 120 }}
          />
          <TextField
            label={t.venueLink}
            value={newEntry.venueLink}
            onChange={(e) => setNewEntry((prev) => ({ ...prev, venueLink: e.target.value }))}
            size="small"
            sx={{ width: 140 }}
          />
          <TextField
            label={t.startTime}
            type="time"
            value={newEntry.lectureStartTime}
            onChange={(e) => setNewEntry((prev) => ({ ...prev, lectureStartTime: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ width: 110 }}
          />
          <TextField
            label={t.endTime}
            type="time"
            value={newEntry.lectureEndTime}
            onChange={(e) => setNewEntry((prev) => ({ ...prev, lectureEndTime: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ width: 110 }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={newEntry.hasQuiz}
                onChange={(e) => setNewEntry((prev) => ({ ...prev, hasQuiz: e.target.checked }))}
              />
            }
            label={t.quiz}
            sx={{ m: 0 }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleSaveNew}
            sx={{
              px: 2,
              py: 0.5,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <AddIcon fontSize="small" />
            {t.addLectureButton}
          </Button>
        </Box>
      </Paper>

      <Table
        size="small"
        sx={{
          mt: 1,
          backgroundColor: '#fafbfc',
          '& thead': { backgroundColor: '#f5f7fa' },
          '& tbody tr:hover': { backgroundColor: '#f0f4ff' },
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <TableHead>
          <TableRow sx={{ '& > th': { fontWeight: 'bold' } }}>
            <TableCell>{t.day}</TableCell>
            <TableCell>{t.startTime}</TableCell>
            <TableCell>{t.endTime}</TableCell>
            <TableCell>{t.venue}</TableCell>
            <TableCell>{t.venueLink}</TableCell>
            <TableCell>{t.homework || 'Homework'}</TableCell>
            <TableCell>{t.quiz}</TableCell>
            <TableCell>{t.actions}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lectures.map((lecture, idx) => (
            <TableRow key={idx}>
              <TableCell>{lecture.lectureDay}</TableCell>
              <TableCell>{lecture.lectureStartTime}</TableCell>
              <TableCell>{lecture.lectureEndTime}</TableCell>
              <TableCell>{lecture.venue}</TableCell>
              <TableCell>
                <a href={lecture.venueLink} target="_blank" rel="noreferrer">
                  {t.link}
                </a>
              </TableCell>
              <TableCell>{hasHomework ? t.yes : t.no}</TableCell>
              <TableCell>{lecture.hasQuiz ? t.yes : t.no}</TableCell>
              <TableCell>
                <Tooltip title={t.edit}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditEntry(lecture);
                      setEditKeys({
                        lectureDay: lecture.lectureDay,
                        lectureStartTime: lecture.lectureStartTime,
                        lectureEndTime: lecture.lectureEndTime,
                      });
                    }}
                  >
                    <EditIcon fontSize="small" color="primary" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t.delete}>
                  <IconButton size="small" onClick={() => handleDelete(lecture)}>
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editEntry} onClose={() => setEditEntry(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t.editDialogTitle}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            select
            label={t.day}
            value={editEntry?.lectureDay || ''}
            onChange={(e) =>
              setEditEntry((prev) => prev && { ...prev, lectureDay: e.target.value })
            }
          >
            {weekdayOptions.map((day) => (
              <MenuItem key={day} value={day}>
                {day}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t.venue}
            value={editEntry?.venue || ''}
            onChange={(e) => setEditEntry((prev) => prev && { ...prev, venue: e.target.value })}
          />
          <TextField
            label={t.venueLink}
            value={editEntry?.venueLink || ''}
            onChange={(e) => setEditEntry((prev) => prev && { ...prev, venueLink: e.target.value })}
          />
          <TextField
            label={t.startTime}
            type="time"
            value={editEntry?.lectureStartTime || ''}
            onChange={(e) =>
              setEditEntry((prev) => prev && { ...prev, lectureStartTime: e.target.value })
            }
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t.endTime}
            type="time"
            value={editEntry?.lectureEndTime || ''}
            onChange={(e) =>
              setEditEntry((prev) => prev && { ...prev, lectureEndTime: e.target.value })
            }
            InputLabelProps={{ shrink: true }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editEntry?.hasQuiz || false}
                onChange={(e) =>
                  setEditEntry((prev) => prev && { ...prev, hasQuiz: e.target.checked })
                }
              />
            }
            label={t.quiz}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditEntry(null)}>{t.cancel}</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            {t.save}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default LectureScheduleTab;
