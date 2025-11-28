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
  updateSeriesId,
} from '@alea/spec';
import { UniversityDetail, WEEKDAYS_UI_ORDER } from '@alea/utils';
import { getAllCourses } from '@alea/spec';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { getLocaleObject } from '../../lang/utils';

interface LectureScheduleTabProps {
  courseId: string;
  instanceId: string;
}

<<<<<<< HEAD
type LectureScheduleUI = LectureSchedule & {
  quizOffsetDirection?: 'before' | 'after';
};

const initialNewEntry: LectureScheduleUI = {
=======
type TabType = 'lecture' | 'tutorial';

const initialNewEntry: LectureSchedule = {
>>>>>>> origin/main
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
  const weekdayOptions = WEEKDAYS_UI_ORDER;
  const [selectedScheduleType, setSelectedScheduleType] = useState<'lecture' | 'tutorial'>(
    'lecture'
  );

  const [lectureScheduleData, setLectureScheduleData] = useState<LectureScheduleUI>(initialNewEntry);
  const [tutorialScheduleData, setTutorialScheduleData] =
    useState<LectureScheduleUI>(initialNewEntry);
  const [lectures, setLectures] = useState<LectureSchedule[]>([]);
  const [tutorials, setTutorials] = useState<LectureSchedule[]>([]);
  const scheduleToShow = selectedScheduleType === 'lecture' ? lectures : tutorials;
  const [loading, setLoading] = useState(true);
  const [hasHomework, setHasHomework] = useState<boolean>(false);
  const [hasQuiz, setHasQuiz] = useState<boolean>(false);
  const [timezone, setTimezone] = useState<string | undefined>(undefined);
  const [editEntry, setEditEntry] = useState<LectureScheduleUI | null>(null);
  const [editKeys, setEditKeys] = useState<{
    lectureDay: string;
    lectureStartTime: string;
    lectureEndTime: string;
  } | null>(null);
  const [newEntry, setNewEntry] = useState<LectureSchedule>(initialNewEntry);
  const [seriesId, setSeriesIdState] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('lecture');

  const fetchLectures = useCallback(async () => {
    try {
      const data = await getLectureEntry({ courseId, instanceId });
      setLectures(data.lectureSchedule || []);
      setTutorials(data.tutorialSchedule || []);
      setHasHomework(!!data.hasHomework);
      setHasQuiz(!!data.hasQuiz);
      setSeriesIdState(data.seriesId || '');
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
  }, [courseId, instanceId]);

  useEffect(() => {
    fetchLectures();
  }, [fetchLectures]);

  useEffect(() => {
    async function loadTimezone() {
      try {
        const courses = await getAllCourses();
        const universityId = courses?.[courseId]?.universityId;
        if (universityId && UniversityDetail[universityId]) {
          setTimezone(UniversityDetail[universityId].defaultTimezone);
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
      const updatedEntry = {
        ...editEntry,
        quizOffsetMinutes: editEntry.quizOffsetMinutes || 0,
      };
      await updateLectureEntry({
        courseId,
        instanceId,
        lectureDay: editKeys.lectureDay,
        lectureStartTime: editKeys.lectureStartTime,
        lectureEndTime: editKeys.lectureEndTime,
        updatedLectureEntry: updatedEntry,
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
    if (!newEntry.lectureDay || !newEntry.lectureStartTime || !newEntry.lectureEndTime)
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
    try {
      let cleanEntry;
      if (selectedScheduleType === 'lecture') {
        const minutes = entryToSave.quizOffsetMinutes || 0;
        const direction = entryToSave.quizOffsetDirection || 'before';
        const signedOffset = direction === 'before' ? -minutes : minutes;
        cleanEntry = {
          ...entryToSave,
          quizOffsetMinutes: signedOffset,
        };
      } else {
        cleanEntry = {
          lectureDay: entryToSave.lectureDay,
          lectureStartTime: entryToSave.lectureStartTime,
          lectureEndTime: entryToSave.lectureEndTime,
          venue: entryToSave.venue,
          venueLink: entryToSave.venueLink,
        };
      }
      await addLectureSchedule({
        courseId,
        instanceId,
        lectureEntry: cleanEntry,
        scheduleType: selectedScheduleType,
      });

      setNewEntry(initialNewEntry);

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

  const handleFieldChange = (field: keyof LectureScheduleUI, value: string | boolean | number) => {
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
          <TextField
            label="Series ID"
            value={seriesId}
            size="small"
            sx={{ width: 140 }}
            placeholder="4334"
            onChange={(e) => setSeriesIdState(e.target.value)}
            onBlur={async () => {
              if (!seriesId.trim()) return;
              const confirmUpdate = confirm('Are you sure you want to update the Series ID?');
              if (!confirmUpdate) return;
              try {
                await updateSeriesId({ courseId, instanceId, seriesId });
                alert('Series ID updated successfully!');
                fetchLectures();
              } catch (err) {
                console.error('Failed to update Series ID', err);
                alert('Failed to update Series ID. Please try again.');
              }
            }}
          />
        </Box>
      </Paper>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          borderBottom: '2px solid #684848ff',
          mb: 2,
        }}
      >
        {[
          { label: 'Lecture Schedule', type: 'lecture' },
          { label: 'Tutorial Schedule', type: 'tutorial' },
        ].map((item) => {
          const isActive = activeTab === item.type;
          return (
            <Box
              key={item.type}
              onClick={() => {
                setActiveTab(item.type as TabType);

                setSelectedScheduleType(item.type as 'lecture' | 'tutorial');
              }}
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
          {selectedScheduleType === 'lecture' && lectureScheduleData.hasQuiz && (
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'center',
                flexWrap: 'wrap',
                mt: 1,
                pl: 1,
                borderLeft: '3px solid #203360',
              }}
            >
              <Typography fontWeight="bold" sx={{ width: '100%' }}>
                Quiz Settings
              </Typography>

              <TextField
                label="Offset (min)"
                type="number"
                value={Math.abs(lectureScheduleData.quizOffsetMinutes)}
                onChange={(e) => {
                    const absMinutes = Number(e.target.value);
                    const direction = lectureScheduleData.quizOffsetDirection || 'before';
                    const signedOffset = direction === 'before' ? -absMinutes : absMinutes;
                    handleFieldChange('quizOffsetMinutes', signedOffset);
                  }
                }
                size="small"
                sx={{ width: 120 }}
              />
              <TextField
                select
                label="Before/After"
                value={lectureScheduleData.quizOffsetDirection || 'before'}
                onChange={(e) => handleFieldChange('quizOffsetDirection', e.target.value)}
                size="small"
                sx={{ width: 140 }}
              >
                <MenuItem value="before">Before</MenuItem>
                <MenuItem value="after">After</MenuItem>
              </TextField>
              <TextField
                select
                label="From"
                value={lectureScheduleData.quizOffsetReference || 'lecture-start'}
                onChange={(e) =>
                  handleFieldChange(
                    'quizOffsetReference',
                    e.target.value as 'lecture-start' | 'lecture-end'
                  )
                }
                size="small"
                sx={{ width: 170 }}
              >
                <MenuItem value="lecture-start">Start of Lecture</MenuItem>
                <MenuItem value="lecture-end">End of Lecture</MenuItem>
              </TextField>

              <TextField
                label="Quiz Duration (min)"
                type="number"
                value={lectureScheduleData.quizDurationMinutes || ''}
                onChange={(e) => handleFieldChange('quizDurationMinutes', Number(e.target.value))}
                size="small"
                sx={{ width: 160 }}
              />

              <TextField
                label="Feedback Delay (min)"
                type="number"
                value={lectureScheduleData.quizFeedbackDelayMinutes || ''}
                onChange={(e) =>
                  handleFieldChange('quizFeedbackDelayMinutes', Number(e.target.value))
                }
                size="small"
                sx={{ width: 180 }}
              />
            </Box>
          )}
          <Button
            variant="contained"
            size="small"
            onClick={handleSaveNew}
      <>
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
<<<<<<< HEAD
              <TableCell>
                <Tooltip title={t.edit}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const absMinutes = Math.abs(entry.quizOffsetMinutes || 0);
                      const direction =
                        entry.quizOffsetMinutes && entry.quizOffsetMinutes < 0 ? 'before' : 'after';

                      setEditEntry({
                        ...entry,
                        quizOffsetMinutes: absMinutes,
                        quizOffsetDirection: direction,
                        quizOffsetReference: entry.quizOffsetReference || 'lecture-start',
                      });
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
=======

              <TableCell>{t.actions}</TableCell>
>>>>>>> origin/main
            </TableRow>
          </TableHead>

          <TableBody>
            {scheduleToShow.length > 0 &&
              scheduleToShow.map((entry, idx) => (
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
      </>
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
          {selectedScheduleType === 'lecture' && editEntry?.hasQuiz && (
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'center',
                flexWrap: 'wrap',
                mt: 1,
                pl: 1,
                borderLeft: '3px solid #203360',
              }}
            >
              <Typography fontWeight="bold" sx={{ width: '100%' }}>
                Quiz Settings
              </Typography>

              <TextField
                label="Offset (min)"
                type="number"
                value={Math.abs(editEntry?.quizOffsetMinutes || 0)}
                onChange={(e) => {
                  const absMinutes = Number(e.target.value);
                  const direction = editEntry?.quizOffsetDirection || 'before';
                  const signedOffset = direction === 'before' ? -absMinutes : absMinutes;
                  setEditEntry(
                    (prev) => prev && { ...prev, quizOffsetMinutes: signedOffset }
                  );
                }}
                size="small"
                sx={{ width: 120 }}
              />

              <TextField
                select
                label="Before/After"
                value={editEntry?.quizOffsetDirection || 'before'}
                onChange={(e) =>
                  setEditEntry(
                    (prev) =>
                      prev && {
                        ...prev,
                        quizOffsetDirection: e.target.value as 'before' | 'after',
                      }
                  )
                }
                size="small"
                sx={{ width: 140 }}
              >
                <MenuItem value="before">Before</MenuItem>
                <MenuItem value="after">After</MenuItem>
              </TextField>

              <TextField
                select
                label="From"
                value={editEntry?.quizOffsetReference || 'lecture-start'}
                onChange={(e) =>
                  setEditEntry(
                    (prev) =>
                      prev && {
                        ...prev,
                        quizOffsetReference: e.target.value as 'lecture-start' | 'lecture-end',
                      }
                  )
                }
                size="small"
                sx={{ width: 170 }}
              >
                <MenuItem value="lecture-start">Start of Lecture</MenuItem>
                <MenuItem value="lecture-end">End of Lecture</MenuItem>
              </TextField>

              <TextField
                label="Quiz Duration (min)"
                type="number"
                value={editEntry?.quizDurationMinutes || ''}
                onChange={(e) =>
                  setEditEntry(
                    (prev) => prev && { ...prev, quizDurationMinutes: Number(e.target.value) }
                  )
                }
                size="small"
                sx={{ width: 160 }}
              />

              <TextField
                label="Feedback Delay (min)"
                type="number"
                value={editEntry?.quizFeedbackDelayMinutes || ''}
                onChange={(e) =>
                  setEditEntry(
                    (prev) => prev && { ...prev, quizFeedbackDelayMinutes: Number(e.target.value) }
                  )
                }
                size="small"
                sx={{ width: 180 }}
              />
            </Box>
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
