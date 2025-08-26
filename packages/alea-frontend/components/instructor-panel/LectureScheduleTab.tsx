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
  LectureEntry,
  getLectureEntry,
  updateLectureEntry,
  deleteLectureEntry,
  addLectureEntry,
} from '@stex-react/api';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { getLocaleObject } from '../../lang/utils';

interface LectureScheduleTabProps {
  courseId: string;
  instanceId: string;
}

const initialNewEntry: LectureEntry = {
  lectureDay: '',
  lectureStartTime: '',
  lectureEndTime: '',
  venue: '',
  venueLink: '',
  hasHomework: false,
  hasQuiz: false,
};

const LectureScheduleTab: React.FC<LectureScheduleTabProps> = ({ courseId, instanceId }) => {
  const router = useRouter();
  const { dashboard: t } = getLocaleObject(router);
  const weekdayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [lectures, setLectures] = useState<LectureEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEntry, setEditEntry] = useState<LectureEntry | null>(null);
  const [editKeys, setEditKeys] = useState<{
    lectureDay: string;
    lectureStartTime: string;
    lectureEndTime: string;
  } | null>(null);
  const [newEntry, setNewEntry] = useState<LectureEntry>(initialNewEntry);

  const fetchLectures = useCallback(async () => {
    try {
      const data = await getLectureEntry({ courseId, instanceId });
      setLectures(data.lectureSchedule || []);
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

  const handleDelete = async (lecture: LectureEntry) => {
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
              l.hasQuiz === lecture.hasQuiz &&
              l.hasHomework === lecture.hasHomework
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
      await addLectureEntry({
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
            label={t.zoomLink}
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
                checked={newEntry.hasHomework}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, hasHomework: e.target.checked }))
                }
              />
            }
            label={t.homework}
            sx={{ m: 0 }}
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
            <TableCell>{t.zoomLink}</TableCell>
            <TableCell>{t.homework}</TableCell>
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
              <TableCell>{lecture.hasHomework ? t.yes : t.no}</TableCell>
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
            label={t.zoomLink}
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
                checked={editEntry?.hasHomework || false}
                onChange={(e) =>
                  setEditEntry((prev) => prev && { ...prev, hasHomework: e.target.checked })
                }
              />
            }
            label={t.homework}
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
