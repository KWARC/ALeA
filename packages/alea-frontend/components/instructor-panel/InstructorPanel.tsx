import { Box, Tabs, Tab, Typography, Button } from '@mui/material';
import { useState } from 'react';
// import CourseMetadataTab from './CourseMetadataTab';
import AnnouncementsTab from './AnnouncementsTab';
import LectureScheduleTab from './LectureScheduleTab';
import { createInstructorCourseMemberAcl } from '@stex-react/api';

interface InstructorPanelProps {
  courseId: string;
  instanceId: string;
}

const InstructorPanel: React.FC<InstructorPanelProps> = ({ courseId, instanceId }) => {
  const [tab, setTab] = useState<number>(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => setTab(newValue);
  const handleCreateMemberACL = async () => {
    try {
      const { aclId } = await createInstructorCourseMemberAcl(courseId);
      if (aclId) {
        alert(`Member ACL created successfully with ID: ${aclId}`);
      } else {
        alert('Failed to create ACL');
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong while creating ACL');
    }
  };

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight="bold">
          Course metadata
        </Typography>
        <Box display="flex" gap={2}>
          <Button onClick={handleCreateMemberACL} variant="contained" color="primary">
            Create Member ACL
          </Button>
          <Button variant="contained">Generate CURRENT: SEM JSON</Button>
        </Box>
      </Box>

      {/* <Tabs value={tab} onChange={handleChange} sx={{ my: 2 }}>
        <Tab label="Courses" />
      </Tabs> */}

      <Box mt={2} border={1} borderRadius={2} borderColor="grey.300">
        <AnnouncementsTab courseId={courseId} instanceId={instanceId} />
      </Box>

      <Box mt={2} border={1} borderRadius={2} borderColor="grey.300">
        <LectureScheduleTab courseId={courseId} />
      </Box>
    </Box>
  );
};

export default InstructorPanel;
