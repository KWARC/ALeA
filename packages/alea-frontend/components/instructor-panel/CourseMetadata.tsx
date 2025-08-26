import { Box, Typography, Button, CircularProgress, Snackbar, Alert } from '@mui/material';
import { useEffect, useState } from 'react';
import AnnouncementsTab from './AnnouncementsTab';
import LectureScheduleTab from './LectureScheduleTab';
import {
  createInstructorResourceActions,
  createSemesterAclsForCourse,
  createStaffResourceActions,
  createStudentResourceActions,
  isCourseSemesterSetupComplete,
} from 'packages/utils/src/lib/semester-helper';

interface CourseMetadataProps {
  courseId: string;
  instanceId: string;
}

const CourseMetadata: React.FC<CourseMetadataProps> = ({ courseId, instanceId }) => {
  const [semesterSetupLoading, setSemesterSetupLoading] = useState(false);
  const [semesterSetupMessage, setSemesterSetupMessage] = useState('');
  const [isAlreadySetup, setIsAlreadySetup] = useState(false);

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
            {isAlreadySetup ? "ACL's already created" : "Create Course ACL"}
          </Button>
          <Button variant="contained">Generate CURRENT: SEM JSON</Button>
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
