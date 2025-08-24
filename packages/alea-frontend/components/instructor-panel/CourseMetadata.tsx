import { Box, Typography, Button } from '@mui/material';
import AnnouncementsTab from './AnnouncementsTab';
import LectureScheduleTab from './LectureScheduleTab';

interface CourseMetadataProps {
  courseId: string;
  instanceId: string;
}

const CourseMetadata: React.FC<CourseMetadataProps> = ({ courseId, instanceId }) => {
  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight="bold">
          Course metadata
        </Typography>
        <Box display="flex" gap={2}>
          <Button variant="contained">Generate CURRENT: SEM JSON</Button>
        </Box>
      </Box>

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
