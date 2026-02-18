import { Box, Typography, Button, CircularProgress, Snackbar, Alert } from '@mui/material';
import { useEffect, useState } from 'react';
import AnnouncementsTab from './Announcements';
import { generateLectureEntry, checkLectureEntriesExist } from '@alea/spec';
import LectureScheduleTab from './LectureSchedule';
import CourseInfoTab from './CourseInfo';
import { getLocaleObject } from '../../lang/utils';
import { useRouter } from 'next/router';

interface CourseMetadataProps {
  courseId: string;
  instanceId: string;
}

const CourseMetadata: React.FC<CourseMetadataProps> = ({ courseId, instanceId }) => {
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateMessage, setGenerateMessage] = useState('');
  const [hasEntries, setHasEntries] = useState(false);
  const router = useRouter();
  const { courseMetadata: tm } = getLocaleObject(router);

  useEffect(() => {
    const checkEntries = async () => {
      try {
        const result = await checkLectureEntriesExist(courseId);
        setHasEntries(result.hasEntries);
      } catch (e) {
        console.error('Failed to check lecture entries:', e);
      }
    };
    checkEntries();
  }, [courseId]);

  const handleGenerateLectureEntry = async () => {
    if (hasEntries) return;
    
    setGenerateLoading(true);
    setGenerateMessage('Generating lecture entries...');
    try {
      const data = await generateLectureEntry(courseId, instanceId);
      if (data && !data.error) {
        if (data.alreadyExists) {
          setHasEntries(true);
          setGenerateMessage(
            `Lecture entries already exist for courseId ${courseId} (${data.count} entries)`
          );
        } else {
          setHasEntries(true);
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
          {tm.pageTitle}
        </Typography>
        <Button
          variant="contained"
          onClick={handleGenerateLectureEntry}
          disabled={generateLoading || hasEntries}
          startIcon={generateLoading ? <CircularProgress size={20} /> : null}
        >
          {hasEntries ? tm.lectureEntriesAlreadyGenerated : tm.generateLectureEntry}
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
        <CourseInfoTab courseId={courseId} instanceId={instanceId} />
      </Box>

      <Box mt={2} border={1} borderRadius={2} borderColor="grey.300">
        <LectureScheduleTab courseId={courseId} instanceId={instanceId} />
      </Box>
    </Box>
  );
};

export default CourseMetadata;
