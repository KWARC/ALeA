import { Box, Typography, Button, CircularProgress, Snackbar, Alert } from '@mui/material';
import { useEffect, useState } from 'react';
import AnnouncementsTab from './Announcements';
import { generateLectureEntry } from '@alea/spec';
import LectureScheduleTab from './LectureSchedule';

interface CourseMetadataProps {
  courseId: string;
  instanceId: string;
}

const CourseMetadata: React.FC<CourseMetadataProps> = ({ courseId, instanceId }) => {
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateMessage, setGenerateMessage] = useState('');
  const handleGenerateLectureEntry = async () => {
    setGenerateLoading(true);
    setGenerateMessage('Generating lecture entries...');
    try {
      const data = await generateLectureEntry(courseId, instanceId);
      if (data && !data.error) {
        if (data.alreadyExists) {
          setGenerateMessage(
            `Lecture entries already exist for courseId ${courseId} (${data.count} entries)`
          );
        } else {
          setGenerateMessage(
            `Lecture entry generation successful for courseId ${courseId} (${data.count} entries)`
          );
        }
      } else {
        setGenerateMessage(`Lecture entry generation failed: ${data?.error || 'Unknown error'}`);
      }
    } catch (e) {
      setGenerateMessage(`Lecture entry generation failed: ${(e as Error).message}`);
    } finally {
      setGenerateLoading(false);
    }
  };

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight="bold">
          Course metadata
        </Typography>
        <Button
          variant="contained"
          onClick={handleGenerateLectureEntry}
          disabled={generateLoading}
          startIcon={generateLoading ? <CircularProgress size={20} /> : null}
        >
          Generate Lecture Entry
        </Button>
      </Box>
      <Snackbar
        open={!!generateMessage}
        autoHideDuration={generateLoading ? null : 4000}
        onClose={() => setGenerateMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={
            generateLoading
              ? 'info'
              : generateMessage.toLowerCase().includes('failed')
              ? 'error'
              : 'success'
          }
          sx={{ width: '100%' }}
          icon={generateLoading ? <CircularProgress size={20} /> : undefined}
        >
          {generateMessage}
        </Alert>
      </Snackbar>

      <Box mt={2} border={1} borderRadius={2} borderColor="grey.300">
        <AnnouncementsTab courseId={courseId} instanceId={instanceId} />
      </Box>

      <Box mt={2} border={1} borderRadius={2} borderColor="grey.300">
        <LectureScheduleTab courseId={courseId} instanceId={instanceId} />
      </Box>
    </Box>
  );
};

export default CourseMetadata;
