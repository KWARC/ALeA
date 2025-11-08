import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  TextField,
  MenuItem,
} from '@mui/material';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
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
import { getCourseInfo } from '@alea/spec';
import { UniversityDetail } from '@alea/utils';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import LectureScheduleSection from './LectureScheduleSection';
import { getLocaleObject } from '../../../lang/utils';

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
  const weekdayOptions = useMemo(
    () => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    []
  );

  const [selectedScheduleType, setSelectedScheduleType] = useState<'lecture' | 'tutorial'>(
    'lecture'
  );
  const [lectureScheduleData, setLectureScheduleData] = useState<LectureSchedule>(initialNewEntry);
  const [tutorialScheduleData, setTutorialScheduleData] =
    useState<LectureSchedule>(initialNewEntry);
  const [lectures, setLectures] = useState<LectureSchedule[]>([]);
  const [tutorials, setTutorials] = useState<LectureSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasHomework, setHasHomework] = useState(false);
  const [hasQuiz, setHasQuiz] = useState(false);
  const [timezone, setTimezone] = useState<string | undefined>();
  const [editEntry, setEditEntry] = useState<LectureSchedule | null>(null);
  const [editKeys, setEditKeys] = useState<{
    lectureDay: string;
    lectureStartTime: string;
    lectureEndTime: string;
  } | null>(null);
  const [seriesId, setSeriesIdState] = useState<string>('');

  const fetchLectures = useCallback(async () => {
    try {
      const data = await getLectureEntry({ courseId, instanceId });
      setLectures(data.lectureSchedule || []);
      setTutorials(data.tutorialSchedule || []);
      setHasHomework(!!data.hasHomework);
      setHasQuiz(!!data.hasQuiz);
      setSeriesIdState(data.seriesId || '');
    } finally {
      setLoading(false);
    }
  }, [courseId, instanceId]);

  useEffect(() => {
    fetchLectures();
  }, [fetchLectures]);

  useEffect(() => {
    (async () => {
      const courses = await getCourseInfo();
      const institution = courses?.[courseId]?.institution;
      if (institution && UniversityDetail[institution])
        setTimezone(UniversityDetail[institution].defaultTimezone);
    })();
  }, [courseId]);

  const handleFieldChange = (field: keyof LectureSchedule, value: string | boolean) => {
    selectedScheduleType === 'lecture'
      ? setLectureScheduleData((prev) => ({ ...prev, [field]: value }))
      : setTutorialScheduleData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdd = async () => {
    const entryToSave =
      selectedScheduleType === 'lecture' ? lectureScheduleData : tutorialScheduleData;
    await addLectureSchedule({
      courseId,
      instanceId,
      lectureEntry: entryToSave,
      scheduleType: selectedScheduleType,
    });
    fetchLectures();
    if (selectedScheduleType === 'lecture') setLectureScheduleData(initialNewEntry);
    else setTutorialScheduleData(initialNewEntry);
  };

  const handleDelete = async (entry: LectureSchedule) => {
    await deleteLectureEntry({
      courseId,
      instanceId,
      lectureEntry: entry,
      scheduleType: selectedScheduleType,
    });
    fetchLectures();
  };

  const handleSaveEdit = async () => {
    if (!editEntry || !editKeys) return;
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
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress color="primary" />
      </Box>
    );

  const activeData = selectedScheduleType === 'lecture' ? lectures : tutorials;
  const activeState =
    selectedScheduleType === 'lecture' ? lectureScheduleData : tutorialScheduleData;
  const setActiveState =
    selectedScheduleType === 'lecture' ? setLectureScheduleData : setTutorialScheduleData;

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" fontWeight="bold" color="primary" mb={2}>
        {t.title.replace('{{courseId}}', courseId)}
      </Typography>

      <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <FormControlLabel
            label="Enable homework for this course"
            control={
              <Checkbox
                checked={hasHomework}
                onChange={async (e) => {
                  const next = e.target.checked;
                  const confirmed = confirm(
                    'Are you sure you want to update homework availability?'
                  );
                  if (!confirmed) return;
                  try {
                    await updateHasHomework({ courseId, instanceId, hasHomework: next });
                    setHasHomework(next);
                    alert('Homework availability updated successfully!');
                  } catch (err) {
                    console.error('Failed to update homework availability', err);
                    alert('Failed to update homework availability. Please try again.');
                  }
                }}
              />
            }
          />

          <FormControlLabel
            label="Enable quiz for this course"
            control={
              <Checkbox
                checked={hasQuiz}
                onChange={async (e) => {
                  const next = e.target.checked;
                  const confirmed = confirm('Are you sure you want to update quiz availability?');
                  if (!confirmed) return;
                  try {
                    await updateHasQuiz({ courseId, instanceId, hasQuiz: next });
                    setHasQuiz(next);
                    alert('Quiz availability updated successfully!');
                  } catch (err) {
                    console.error('Failed to update quiz availability', err);
                    alert('Failed to update quiz availability. Please try again.');
                  }
                }}
              />
            }
          />

          <TextField
            label="Series ID"
            value={seriesId}
            size="small"
            sx={{ width: 100 }}
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
              }}
            >
              {item.label}
            </Box>
          );
        })}
      </Box>

      <LectureScheduleSection
        type={selectedScheduleType}
        t={t}
        timezone={timezone}
        weekdayOptions={weekdayOptions}
        hasHomework={hasHomework}
        scheduleData={activeState}
        setScheduleData={setActiveState}
        scheduleList={activeData}
        onFieldChange={handleFieldChange}
        onAdd={handleAdd}
        onEdit={(entry) => {
          setEditEntry(entry);
          setEditKeys({
            lectureDay: entry.lectureDay,
            lectureStartTime: entry.lectureStartTime,
            lectureEndTime: entry.lectureEndTime,
          });
        }}
        onDelete={handleDelete}
      />

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
          />
          <TextField
            label={t.endTime}
            type="time"
            value={editEntry?.lectureEndTime || ''}
            onChange={(e) =>
              setEditEntry((prev) => prev && { ...prev, lectureEndTime: e.target.value })
            }
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
