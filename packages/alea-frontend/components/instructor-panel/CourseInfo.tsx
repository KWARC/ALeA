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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useEffect, useState } from 'react';
import { getCourseInfo, updateCourseInfo, CourseInfoMetadata, InstructorInfo } from '@alea/spec';

interface CourseInfoTabProps {
  courseId: string;
  instanceId: string;
}

const CourseInfoTab: React.FC<CourseInfoTabProps> = ({ courseId, instanceId }) => {
  const [courseInfo, setCourseInfo] = useState<CourseInfoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchCourseInfo() {
      try {
        const info = await getCourseInfo(courseId, instanceId);
        setCourseInfo(info);
      } catch (err) {
        console.error('Failed to load course info:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCourseInfo();
  }, [courseId, instanceId]);

  const handleChange = (field: keyof CourseInfoMetadata, value: any) => {
    setCourseInfo((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleAddInstructor = () => {
    if (!courseInfo) return;
    const newInstructor: InstructorInfo = { id: '', name: '' };
    handleChange('instructors', [...(courseInfo.instructors || []), newInstructor]);
  };

  const handleRemoveInstructor = async (index: number) => {
    if (!courseInfo) return;

    const ok = confirm('Are you sure you want to delete this instructor?');
    if (!ok) return;

    const updated = [...(courseInfo.instructors || [])];
    updated.splice(index, 1);
    handleChange('instructors', updated);

    try {
      setSaving(true);
      await updateCourseInfo({ ...courseInfo, instructors: updated });
      setMessage('Instructor removed successfully');
    } catch (err) {
      console.error('Failed to auto-save after delete', err);
      setMessage('Failed to save changes');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleInstructorChange = (index: number, field: keyof InstructorInfo, value: string) => {
    if (!courseInfo) return;
    const updated = [...(courseInfo.instructors || [])];
    updated[index] = { ...updated[index], [field]: value };
    handleChange('instructors', updated);
  };

  const handleSave = async () => {
    if (!courseInfo) return;
    setSaving(true);
    try {
      await updateCourseInfo(courseInfo);
      setMessage('✅ Course info updated successfully!');
    } catch (err) {
      console.error('Failed to update course info', err);
      setMessage('❌ Failed to update course info');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const isInstructorInvalid =
    !courseInfo?.instructors ||
    courseInfo.instructors.some((inst) => !inst.id.trim() || !inst.name.trim());

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );

  if (!courseInfo) return <Typography>No course information found.</Typography>;

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper', mt: 2 }}>
      <Typography variant="h6" fontWeight="bold" color="primary" mb={2}>
        Course Information
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <TextField
          label="Course Name"
          value={courseInfo.courseName || ''}
          onChange={(e) => handleChange('courseName', e.target.value)}
          fullWidth
        />
        <TextField
          label="Institution"
          value={courseInfo.institution || ''}
          onChange={(e) => handleChange('institution', e.target.value)}
          fullWidth
        />
        <TextField
          label="Notes URL"
          value={courseInfo.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          fullWidth
        />
        <TextField
          label="Landing Page"
          value={courseInfo.landing || ''}
          onChange={(e) => handleChange('landing', e.target.value)}
          fullWidth
        />
        <TextField
          label="Slides URL"
          value={courseInfo.slides || ''}
          onChange={(e) => handleChange('slides', e.target.value)}
          fullWidth
        />
        <TextField
          label="Teaser"
          value={courseInfo.teaser || ''}
          onChange={(e) => handleChange('teaser', e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
      </Box>

      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle1" fontWeight="bold" mb={1}>
        Instructors
      </Typography>
      {(courseInfo.instructors || []).map((inst, idx) => (
        <Box
          key={idx}
          sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}
        >
          <TextField
            label="Instructor ID"
            value={inst.id}
            onChange={(e) => handleInstructorChange(idx, 'id', e.target.value)}
            sx={{ width: 200 }}
          />
          <TextField
            label="Instructor Name"
            value={inst.name}
            onChange={(e) => handleInstructorChange(idx, 'name', e.target.value)}
            sx={{ width: 250 }}
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
        size="small"
        startIcon={<AddIcon />}
        onClick={handleAddInstructor}
        sx={{ mt: 1 }}
      >
        Add Instructor
      </Button>

      <Divider sx={{ my: 3 }} />

      <Button
        variant="contained"
        color="primary"
        onClick={handleSave}
        disabled={saving || isInstructorInvalid}
        sx={{ px: 3, py: 1 }}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>

      {message && (
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          {message}
        </Typography>
      )}
    </Paper>
  );
};

export default CourseInfoTab;
