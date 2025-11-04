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
  ScheduleType,
  getLectureEntry,
  updateLectureEntry,
  deleteLectureEntry,
  addLectureSchedule,
  updateHasHomework,
  updateHasQuiz,
} from '@alea/spec';
import { getCourseInfo } from '@alea/spec';
import { UniversityDetail } from '@alea/utils';
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
  const [selectedScheduleType, setSelectedScheduleType] = useState<'lecture' | 'tutorial'>(
    'lecture'
  );

  const [lectureScheduleData, setLectureScheduleData] = useState<LectureSchedule>(initialNewEntry);
  const [tutorialScheduleData, setTutorialScheduleData] =
    useState<LectureSchedule>(initialNewEntry);
  const [lectures, setLectures] = useState<LectureSchedule[]>([]);
  const [tutorials, setTutorials] = useState<LectureSchedule[]>([]);
  const scheduleToShow = selectedScheduleType === 'lecture' ? lectures : tutorials;
  const [loading, setLoading] = useState(true);
  const [hasHomework, setHasHomework] = useState<boolean>(false);
  const [hasQuiz, setHasQuiz] = useState<boolean>(false);
  const [timezone, setTimezone] = useState<string | undefined>(undefined);
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
      setTutorials(data.tutorialSchedule || []);
      setHasHomework(!!data.hasHomework);
      setHasQuiz(!!data.hasQuiz);
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

  useEffect(() => {
    async function loadTimezone() {
      try {
        const courses = await getCourseInfo();
        const institution = courses?.[courseId]?.institution;
        if (institution && UniversityDetail[institution]) {
          setTimezone(UniversityDetail[institution].defaultTimezone);
        } else {
          setTimezone(undefined);
        }
      } catch (err) {
        console.error('Failed to load university timezone', err);
      }
    }
    loadTimezone();
  }, [courseId]);
  const handleDelete = async (lecture: LectureSchedule) => {
    if (!selectedScheduleType) return;

    const message =
      selectedScheduleType === 'lecture' ? t.confirmDeleteLecture : t.confirmDeleteTutorial;

    if (!confirm(message)) return;

    try {
      await deleteLectureEntry({
        courseId,
        instanceId,
        lectureEntry: lecture,
        scheduleType: selectedScheduleType,
      });

      const updateFn = selectedScheduleType === 'lecture' ? setLectures : setTutorials;

      updateFn((prev) =>
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
        scheduleType: selectedScheduleType,
      });
      setEditEntry(null);
      setEditKeys(null);
      fetchLectures();
    } catch (err) {
      console.error('Failed to update lecture', err);
    }
  };

  const handleSaveNew = async () => {
    if (!selectedScheduleType) {
      alert('Please first select Lecture Schedule or Tutorial Schedule');
      return;
    }

    const entryToSave =
      selectedScheduleType === 'lecture' ? lectureScheduleData : tutorialScheduleData;

    if (!entryToSave.lectureDay || !entryToSave.lectureStartTime || !entryToSave.lectureEndTime) {
      alert(t.requiredFieldsAlert);
      return;
    }
    const scheduleType = selectedScheduleType;
    try {
      await addLectureSchedule({
        courseId,
        instanceId,
        lectureEntry: entryToSave,
        scheduleType: selectedScheduleType,
      });

      if (selectedScheduleType === 'lecture') {
        setLectures((prev) => [...prev, entryToSave]);
        setLectureScheduleData(initialNewEntry);
      } else {
        setTutorials((prev) => [...prev, entryToSave]);
        setTutorialScheduleData(initialNewEntry);
      }

      fetchLectures();
    } catch (err) {
      console.error('Failed to add lecture', err);
    }
  };

  const handleFieldChange = (field: keyof LectureSchedule, value: string | boolean) => {
    if (!selectedScheduleType) {
      alert('Please first select Lecture Schedule or Tutorial Schedule');
      return;
    }

    if (selectedScheduleType === 'lecture') {
      setLectureScheduleData((prev) => ({ ...prev, [field]: value }));
    } else {
      setTutorialScheduleData((prev) => ({ ...prev, [field]: value }));
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
                  if (!confirm('Are you sure to update homework availability?')) return;
                  try {
                    await updateHasHomework({ courseId, instanceId, hasHomework: next });
                    setHasHomework(next);
                  } catch (err) {
                    console.error('Failed to update homework availability', err);
                  }
                }}
              />
            }
            label="Enable homework for this course"
            sx={{ m: 0 }}
          />

          <FormControlLabel
            labelPlacement="start"
            control={
              <Checkbox
                checked={hasQuiz}
                onChange={async (e) => {
                  const next = e.target.checked;
                  if (!confirm('Are you sure to update quiz availability?')) return;
                  try {
                    await updateHasQuiz({ courseId, instanceId, hasQuiz: next });
                    setHasQuiz(next);
                  } catch (err) {
                    console.error('Failed to update quiz availability', err);
                  }
                }}
              />
            }
            label="Enable quiz for this course"
            sx={{ m: 0 }}
          />
        </Box>
      </Paper>

      <Box
        sx={{ display: 'flex', justifyContent: 'center', borderBottom: '2px solid #e0e0e0', mb: 2 }}
      >
        {[
          { label: 'Lecture Schedule', type: 'lecture' },
          { label: 'Tutorial Schedule', type: 'tutorial' },
        ].map((item) => {
          const isActive = selectedScheduleType === item.type;
          return (
            <Box
              key={item.type}
              onClick={() => setSelectedScheduleType(item.type as 'lecture' | 'tutorial')}
              sx={{
                px: 2,
                py: 1.5,
                cursor: 'pointer',
                fontWeight: isActive ? 700 : 500,
                fontSize: '17px',
                color: isActive ? '#203360' : '#7a7a7a',
                borderBottom: isActive ? '3px solid #203360' : '3px solid transparent',
                transition: '0.25s',
                mr: 3,
                '&:hover': {
                  color: '#203360',
                },
              }}
            >
              {item.label}
            </Box>
          );
        })}
      </Box>

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
            value={
              selectedScheduleType === 'lecture'
                ? lectureScheduleData.lectureDay
                : tutorialScheduleData.lectureDay
            }
            onChange={(e) => handleFieldChange('lectureDay', e.target.value)}
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
            value={
              selectedScheduleType === 'lecture'
                ? lectureScheduleData.venue
                : tutorialScheduleData.venue
            }
            onChange={(e) => handleFieldChange('venue', e.target.value)}
            size="small"
            sx={{ width: 120 }}
          />

          <TextField
            label={t.venueLink}
            value={
              selectedScheduleType === 'lecture'
                ? lectureScheduleData.venueLink
                : tutorialScheduleData.venueLink
            }
            onChange={(e) => handleFieldChange('venueLink', e.target.value)}
            size="small"
            sx={{ width: 140 }}
          />

          <TextField
            label={t.startTime}
            type="time"
            value={
              selectedScheduleType === 'lecture'
                ? lectureScheduleData.lectureStartTime
                : tutorialScheduleData.lectureStartTime
            }
            onChange={(e) => handleFieldChange('lectureStartTime', e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ width: 110 }}
          />

          <TextField
            label={t.endTime}
            type="time"
            value={
              selectedScheduleType === 'lecture'
                ? lectureScheduleData.lectureEndTime
                : tutorialScheduleData.lectureEndTime
            }
            onChange={(e) => handleFieldChange('lectureEndTime', e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ width: 110 }}
          />

          {selectedScheduleType === 'lecture' && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={lectureScheduleData.hasQuiz}
                  onChange={(e) => handleFieldChange('hasQuiz', e.target.checked)}
                />
              }
              label={t.quiz}
              sx={{ m: 0 }}
            />
          )}
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
            {selectedScheduleType === 'lecture' ? 'Add Lecture' : 'Add Tutorial'}
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
          <TableRow>
            <TableCell>{t.day}</TableCell>
            <TableCell>
              {t.startTime} {timezone && `(${timezone})`}
            </TableCell>
            <TableCell>
              {t.endTime} {timezone && `(${timezone})`}
            </TableCell>
            <TableCell>{t.venue}</TableCell>
            <TableCell>{t.venueLink}</TableCell>

            {selectedScheduleType === 'lecture' && (
              <>
                <TableCell>{t.homework || 'Homework'}</TableCell>
                <TableCell>{t.quiz}</TableCell>
              </>
            )}

            <TableCell>{t.actions}</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {scheduleToShow.map((entry, idx) => (
            <TableRow key={idx}>
              <TableCell>{entry.lectureDay}</TableCell>
              <TableCell>{entry.lectureStartTime}</TableCell>
              <TableCell>{entry.lectureEndTime}</TableCell>
              <TableCell>{entry.venue}</TableCell>
              <TableCell>
                <a href={entry.venueLink} target="_blank" rel="noreferrer">
                  {t.link}
                </a>
              </TableCell>
              {selectedScheduleType === 'lecture' && (
                <>
                  <TableCell>{hasHomework ? t.yes : t.no}</TableCell>
                  <TableCell>{entry.hasQuiz ? t.yes : t.no}</TableCell>
                </>
              )}
              <TableCell>
                <Tooltip title={t.edit}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditEntry(entry);
                      setEditKeys({
                        lectureDay: entry.lectureDay,
                        lectureStartTime: entry.lectureStartTime,
                        lectureEndTime: entry.lectureEndTime,
                      });
                    }}
                  >
                    <EditIcon fontSize="small" color="primary" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t.delete}>
                  <IconButton size="small" onClick={() => handleDelete(entry)}>
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={!!editEntry} onClose={() => setEditEntry(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {t.editDialogTitle.replace(
            '{{type}}',
            selectedScheduleType === 'lecture' ? 'Lecture' : 'Tutorial'
          )}
        </DialogTitle>

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
          {selectedScheduleType === 'lecture' && (
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
          )}
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
