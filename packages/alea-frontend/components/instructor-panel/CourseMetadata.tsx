import { Box, Typography, Button, CircularProgress, Snackbar, Alert } from '@mui/material';
import { useEffect, useState } from 'react';
import AnnouncementsTab from './Announcements';
import LectureScheduleTab from './LectureSchedule';
import {
  createInstructorResourceActions,
  createSemesterAclsForCourse,
  createStaffResourceActions,
  createStudentResourceActions,
  isCourseSemesterSetupComplete,
} from 'packages/utils/src/lib/semester-helper';
import { generateLectureEntry } from '@stex-react/spec';

interface CourseMetadataProps {
  courseId: string;
  instanceId: string;
}

const CourseMetadata: React.FC<CourseMetadataProps> = ({ courseId, instanceId }) => {
  const [semesterSetupLoading, setSemesterSetupLoading] = useState(false);
  const [semesterSetupMessage, setSemesterSetupMessage] = useState('');
  const [isAlreadySetup, setIsAlreadySetup] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateMessage, setGenerateMessage] = useState('');

  async function checkIfAlreadySetup() {
    const complete = await isCourseSemesterSetupComplete(courseId);
    setIsAlreadySetup(!!complete);
  }

  useEffect(() => {
    if (courseId) {
      checkIfAlreadySetup();
    }
  }, [courseId]);

  const handleCreateCourseACL = async () => {
    setSemesterSetupLoading(true);
    setSemesterSetupMessage(`Creating semester acl for courseId ${courseId} ...`);
    try {
      await createSemesterAclsForCourse(courseId);
      await createInstructorResourceActions(courseId);
      await createStudentResourceActions(courseId);
      await createStaffResourceActions(courseId);
      setSemesterSetupMessage(`Semester acl setup successful for courseId ${courseId}`);
      await checkIfAlreadySetup();
    } catch (e) {
      setSemesterSetupMessage(`Semester acl setup failed for courseId ${courseId}`);
    } finally {
      setSemesterSetupLoading(false);
    }
  };
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
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            onClick={handleCreateCourseACL}
            disabled={semesterSetupLoading || isAlreadySetup}
            startIcon={semesterSetupLoading ? <CircularProgress size={20} /> : null}
          >
            {isAlreadySetup ? "ACL's already created" : 'Create Course ACL'}
          </Button>
          <Button
            variant="contained"
            onClick={handleGenerateLectureEntry}
            disabled={generateLoading}
            startIcon={generateLoading ? <CircularProgress size={20} /> : null}
          >
            Generate Lecture Entry
          </Button>
        </Box>
      </Box>

      <Snackbar
        open={!!semesterSetupMessage}
        autoHideDuration={semesterSetupLoading ? null : 4000}
        onClose={() => setSemesterSetupMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={
            semesterSetupLoading
              ? 'info'
              : semesterSetupMessage.includes('successful')
              ? 'success'
              : semesterSetupMessage.includes('failed')
              ? 'error'
              : 'info'
          }
          sx={{ width: '100%' }}
          icon={semesterSetupLoading ? <CircularProgress size={20} /> : undefined}
        >
          {semesterSetupMessage}
        </Alert>
      </Snackbar>

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
