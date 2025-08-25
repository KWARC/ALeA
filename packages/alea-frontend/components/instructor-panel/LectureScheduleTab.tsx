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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useEffect, useState, useCallback } from 'react';
import {
  LectureEntry,
  getLectureEntry,
  updateLectureEntry,
  deleteLectureEntry,
  addLectureEntry,
} from '@alea/course-metadata-api';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

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
      console.error('Failed to fetch lectures', err);
    } finally {
      setLoading(false);
    }
  }, [courseId, instanceId]);

  useEffect(() => {
    fetchLectures();
  }, [fetchLectures]);

  const handleDelete = async (lecture: LectureEntry) => {
    if (!confirm('Are you sure you want to delete this lecture?')) return;
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
      alert('Please fill all required fields: Day, Start Time, End Time');
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
      alert('Please fill all required fields: Day, Start Time, End Time');
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
        Lecture Schedule for Course ID: {courseId}
      </Typography>

      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" mb={2}>
          Add New Lecture
        </Typography>
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <TextField
            label="Day"
            value={newEntry.lectureDay}
            onChange={(e) => setNewEntry((prev) => ({ ...prev, lectureDay: e.target.value }))}
            size="small"
            sx={{ width: 110 }}
          />
          <TextField
            label="Venue"
            value={newEntry.venue}
            onChange={(e) => setNewEntry((prev) => ({ ...prev, venue: e.target.value }))}
            size="small"
            sx={{ width: 120 }}
          />
          <TextField
            label="Zoom Link"
            value={newEntry.venueLink}
            onChange={(e) => setNewEntry((prev) => ({ ...prev, venueLink: e.target.value }))}
            size="small"
            sx={{ width: 140 }}
          />
          <TextField
            label="Start Time"
            type="time"
            value={newEntry.lectureStartTime}
            onChange={(e) => setNewEntry((prev) => ({ ...prev, lectureStartTime: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ width: 110 }}
          />
          <TextField
            label="End Time"
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
                onChange={(e) => setNewEntry((prev) => ({ ...prev, hasHomework: e.target.checked }))}
              />
            }
            label="Homework"
            sx={{ m: 0 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={newEntry.hasQuiz}
                onChange={(e) => setNewEntry((prev) => ({ ...prev, hasQuiz: e.target.checked }))}
              />
            }
            label="Quiz"
            sx={{ m: 0 }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleSaveNew}
            sx={{ px: 2, py: 0.5, borderRadius: 10, minWidth: 100, display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}
          >
            <AddIcon fontSize="small" />
            Add Lecture
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
            <TableCell>Day</TableCell>
            <TableCell>Start Time</TableCell>
            <TableCell>End Time</TableCell>
            <TableCell>Venue</TableCell>
            <TableCell>Venue Link</TableCell>
            <TableCell>Homework</TableCell>
            <TableCell>Quiz</TableCell>
            <TableCell>Actions</TableCell>
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
                  Link
                </a>
              </TableCell>
              <TableCell>{lecture.hasHomework ? 'Yes' : 'No'}</TableCell>
              <TableCell>{lecture.hasQuiz ? 'Yes' : 'No'}</TableCell>
              <TableCell>
                <Tooltip title="Edit">
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
                <Tooltip title="Delete">
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
        <DialogTitle>Edit Lecture</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Day"
            value={editEntry?.lectureDay || ''}
            onChange={(e) =>
              setEditEntry((prev) => prev && { ...prev, lectureDay: e.target.value })
            }
          />
          <TextField
            label="Venue"
            value={editEntry?.venue || ''}
            onChange={(e) => setEditEntry((prev) => prev && { ...prev, venue: e.target.value })}
          />
          <TextField
            label="Zoom Link"
            value={editEntry?.venueLink || ''}
            onChange={(e) => setEditEntry((prev) => prev && { ...prev, venueLink: e.target.value })}
          />
          <TextField
            label="Start Time"
            type="time"
            value={editEntry?.lectureStartTime || ''}
            onChange={(e) =>
              setEditEntry((prev) => prev && { ...prev, lectureStartTime: e.target.value })
            }
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Time"
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
            label="Homework"
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
            label="Quiz"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditEntry(null)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default LectureScheduleTab;
