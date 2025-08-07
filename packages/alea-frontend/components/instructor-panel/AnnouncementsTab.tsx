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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface Announcement {
  id: string;
  courseId: string;
  instructorId: string;
  message: string;
  createdAt: number;
  visibleUntil: number;
}

interface AnnouncementsTabProps {
  courseId: string;
}

const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({ courseId }) => {
  const announcements: Announcement[] = [
  {
    id: '1',
    courseId: 'ai-1',
    instructorId: 'joy',
    message: 'Assignments submission due soon.',
    createdAt: Date.now(),
    visibleUntil: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days later
  },
  {
    id: '2',
    courseId: 'ai-1',
    instructorId: 'joy',
    message: 'The module 2 class is postponed.',
    createdAt: Date.now(),
    visibleUntil: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days later
  },
];


  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight="bold">
          Announcements for Course ID: {courseId}
        </Typography>
        <Button variant="contained" size="small" color="primary">
          + New Announcement
        </Button>
      </Box>
      <Table size="small" sx={{ mt: 1 }}>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Course ID</TableCell>
            <TableCell>Instructor</TableCell>
            <TableCell>Message</TableCell>
            <TableCell>Created At</TableCell>
            <TableCell>Visible Until</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {announcements.map((a) => (
            <TableRow key={a.id}>
              <TableCell>{a.id}</TableCell>
              <TableCell>{a.courseId}</TableCell>
              <TableCell>{a.instructorId}</TableCell>
              <TableCell>{a.message}</TableCell>
              <TableCell>{new Date(a.createdAt).toLocaleString()}</TableCell>
              <TableCell>{new Date(a.visibleUntil).toLocaleString()}</TableCell>
              <TableCell>
                <IconButton size="small">
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default AnnouncementsTab;
