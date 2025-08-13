import React, { useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
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
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: '1',
      courseId: 'ai-1',
      instructorId: 'joy',
      message: 'Assignments submission due soon.',
      createdAt: Date.now(),
      visibleUntil: Date.now() + 7 * 24 * 60 * 60 * 1000,
    },
    {
      id: '2',
      courseId: 'ai-1',
      instructorId: 'joy',
      message: 'The module 2 class is postponed.',
      createdAt: Date.now(),
      visibleUntil: Date.now() + 5 * 24 * 60 * 60 * 1000,
    },
  ]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [newDate, setNewDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );

  const handleCreate = () => {
    if (!newMessage.trim() || !newDate) return;

    const nextId = announcements.length
      ? String(Math.max(...announcements.map((a) => Number(a.id))) + 1)
      : '1';

    setAnnouncements((prev) => [
      ...prev,
      {
        id: nextId,
        courseId,
        instructorId: 'joy',
        message: newMessage.trim(),
        createdAt: Date.now(),
        visibleUntil: new Date(newDate).getTime(),
      },
    ]);

    setNewMessage('');
    setNewDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
    setDialogOpen(false);
  };

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight="bold">
          Announcements for Course ID: {courseId}
        </Typography>
        <Button
          variant="contained"
          size="small"
          color="primary"
          onClick={() => setDialogOpen(true)}
        >
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
          {[...announcements]
            .sort((a, b) => Number(a.id) - Number(b.id))
            .map((a) => (
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Announcement</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              fullWidth
              multiline
              minRows={3}
            />
            <TextField
              label="Visible Until"
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AnnouncementsTab;