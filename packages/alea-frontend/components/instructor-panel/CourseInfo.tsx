import {
  Box,
  Typography,
  Paper,
  TextField,
  CircularProgress,
  Button,
  Divider,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useEffect, useState } from 'react';
import {
  getCourseInfoMetadata,
  updateCourseInfoMetadata,
  CourseInfoMetadata,
  InstructorInfo,
} from '@alea/spec';
import { useRouter } from 'next/router';

interface CourseInfoTabProps {
  courseId: string;
  instanceId: string;
}
export default function CourseInfoTab({ courseId, instanceId }: CourseInfoTabProps) {
  const router = useRouter();
  // const courseId = router.query.courseId as string;
  // const instanceId = router.query.instanceId as string;

  const [courseInfo, setCourseInfo] = useState<CourseInfoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!router.isReady || !courseId || !instanceId) return;
    async function load() {
      try {
        const info = await getCourseInfoMetadata(courseId, instanceId);
        setCourseInfo(info);
      } catch (err) {
        console.error(err);
        setToast({ type: 'error', text: 'Failed to load course info' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router.isReady, courseId, instanceId]);

  const setField = (field: keyof CourseInfoMetadata, value: any) => {
    setCourseInfo((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleAddInstructor = () => {
    if (!courseInfo) return;
    const next = [...courseInfo.instructors, { id: '', name: '' }];
    setField('instructors', next);
  };

  const handleInstructorChange = (index: number, field: keyof InstructorInfo, value: string) => {
    if (!courseInfo) return;
    const updated = [...courseInfo.instructors];
    updated[index] = { ...updated[index], [field]: value };
    setField('instructors', updated);
  };

  const handleRemoveInstructor = async (index: number) => {
    if (!courseInfo) return;

    if (!confirm('Are you sure you want to remove this instructor?')) return;

    const updated = [...courseInfo.instructors];
    updated.splice(index, 1);
    setField('instructors', updated);

    try {
      setSaving(true);
      await updateCourseInfoMetadata({ ...courseInfo, instructors: updated });
      setToast({ type: 'success', text: 'Instructor removed successfully' });
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', text: 'Failed to update instructors' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!courseInfo) return;

    setSaving(true);
    try {
      await updateCourseInfoMetadata(courseInfo);
      setToast({ type: 'success', text: 'Course info updated successfully' });
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', text: 'Failed to update course info' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !courseInfo) {
    return (
      <Box sx={{ p: 5, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper', mt: 2 }}>
      <Typography variant="h6" fontWeight="bold" color="primary" mb={2}>
        Course Information
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <TextField
          label="Course Name"
          value={courseInfo.courseName}
          onChange={(e) => setField('courseName', e.target.value)}
          fullWidth
        />

        <TextField
          label="University ID"
          value={courseInfo.universityId || ''}
          onChange={(e) => setField('universityId', e.target.value)}
          fullWidth
        />

        <TextField
          label="Institution"
          value={courseInfo.institution || ''}
          onChange={(e) => setField('institution', e.target.value)}
          fullWidth
        />

        <TextField
          label="Notes URL"
          value={courseInfo.notes}
          onChange={(e) => setField('notes', e.target.value)}
          fullWidth
        />

        <TextField
          label="Landing Page"
          value={courseInfo.landing}
          onChange={(e) => setField('landing', e.target.value)}
          fullWidth
        />

        <TextField
          label="Slides URL"
          value={courseInfo.slides}
          onChange={(e) => setField('slides', e.target.value)}
          fullWidth
        />

        <TextField
          label="Teaser"
          value={courseInfo.teaser || ''}
          onChange={(e) => setField('teaser', e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
      </Box>

      {/* Instructors */}
      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle1" fontWeight="bold" mb={1}>
        Instructors
      </Typography>

      {courseInfo.instructors.map((inst, idx) => (
        <Box key={idx} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
          <TextField
            label="Instructor ID"
            value={inst.id}
            sx={{ width: 200 }}
            onChange={(e) => handleInstructorChange(idx, 'id', e.target.value)}
          />
          <TextField
            label="Instructor Name"
            value={inst.name}
            sx={{ width: 250 }}
            onChange={(e) => handleInstructorChange(idx, 'name', e.target.value)}
          />
          <Tooltip title="Remove Instructor">
            <IconButton color="error" onClick={() => handleRemoveInstructor(idx)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ))}

      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={handleAddInstructor}
        sx={{ mt: 1 }}
      >
        Add Instructor
      </Button>

      {/* Save Button */}
      <Divider sx={{ my: 3 }} />
      <Button
        variant="contained"
        color="primary"
        onClick={handleSave}
        disabled={saving}
        sx={{ px: 3, py: 1 }}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>

      {/* Toast */}
      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)}>
        <Alert severity={toast?.type}>{toast?.text}</Alert>
      </Snackbar>
    </Paper>
  );
}
