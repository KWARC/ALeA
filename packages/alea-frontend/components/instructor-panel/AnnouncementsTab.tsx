import React, { useEffect, useState, useCallback } from 'react';
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
  CircularProgress,
  DialogContentText,
  Snackbar,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import {
  createAnnouncement,
  CreateAnnouncementRequest,
  deleteAnnouncement,
  getAnnouncement,
  updateAnnouncement,
  UpdateAnnouncementRequest,
} from '@stex-react/api';

interface Announcement {
  id: number;
  courseId: string;
  instructorId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  visibleUntil: string;
}

interface AnnouncementsTabProps {
  courseId: string;
  instanceId: string;
}

const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({ courseId, instanceId }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibleUntil, setVisibleUntil] = useState('');
  const [announcementToDelete, setAnnouncementToDelete] = useState<number | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedAnnouncements = await getAnnouncement(courseId);
      setAnnouncements(fetchedAnnouncements);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
      setSnackbarMessage('Failed to fetch announcements. Check console for details.');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCreateOpen = () => {
    setEditingAnnouncement(null);
    setTitle('');
    setContent('');
    const defaultDate = dayjs().add(3, 'days').toISOString().slice(0, 16);
    setVisibleUntil(defaultDate);
    setDialogOpen(true);
  };

  const handleEditOpen = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setTitle(announcement.title);
    setContent(announcement.content);
    setVisibleUntil(dayjs(announcement.visibleUntil).format('YYYY-MM-DDTHH:mm'));
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || !visibleUntil) {
      setSnackbarMessage('Title, content, and date are required.');
      setSnackbarOpen(true);
      return;
    }

    try {
      const visibleUntilSQL = dayjs(visibleUntil).format('YYYY-MM-DD HH:mm:ss');
      if (editingAnnouncement) {
        const updateRequest: UpdateAnnouncementRequest = {
          id: editingAnnouncement.id,
          title: title.trim(),
          content: content.trim(),
          visibleUntil: visibleUntilSQL,
          courseId: courseId,
        };
        await updateAnnouncement(updateRequest);
      } else {
        const createRequest: CreateAnnouncementRequest = {
          courseId: courseId,
          title: title.trim(),
          content: content.trim(),
          visibleUntil: visibleUntilSQL,
        };
        await createAnnouncement(createRequest);
      }
      handleCloseDialog();
      fetchAnnouncements();
      setSnackbarMessage('Announcement saved successfully!');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to save announcement:', error);
      setSnackbarMessage('Failed to save announcement. Check console for details.');
      setSnackbarOpen(true);
    }
  };
console.log({announcementToDelete});
  const handleDelete = async () => {
    if (announcementToDelete !== null) {
      try {
        await deleteAnnouncement({
          id: announcementToDelete,
          courseId: courseId,
          instanceId: instanceId,
        });
        setDeleteDialogOpen(false);
        setAnnouncementToDelete(null);
        fetchAnnouncements();
        setSnackbarMessage('Announcement deleted successfully!');
        setSnackbarOpen(true);
      } catch (error) {
        console.error('Failed to delete announcement:', error);
        setSnackbarMessage('Failed to delete announcement. Check console for details.');
        setSnackbarOpen(true);
      }
    }
  };

  const confirmDelete = (id: number) => {
    setAnnouncementToDelete(id);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
console.log({announcements});
  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight="bold">
          Announcements for Course ID: {courseId}
        </Typography>
        <Button variant="contained" size="small" color="primary" onClick={handleCreateOpen}>
          + New Announcement
        </Button>
      </Box>

      <Table size="small" sx={{ mt: 1 }}>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Course ID</TableCell>
            <TableCell>Instructor</TableCell>
            <TableCell>Title</TableCell>
            <TableCell>Content</TableCell>
            <TableCell>Created At</TableCell>
            <TableCell>Visible Until</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {announcements
            .sort((a, b) => a.id - b.id)
            .map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.id}</TableCell>
                <TableCell>{a.courseId}</TableCell>
                <TableCell>{a.instructorId}</TableCell>
                <TableCell>{a.title}</TableCell>
                <TableCell>{a.content}</TableCell>
                <TableCell>{dayjs(a.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                <TableCell>{dayjs(a.visibleUntil).format('YYYY-MM-DD HH:mm')}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleEditOpen(a)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => confirmDelete(a.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
            />
            <TextField
              label="Content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              fullWidth
              multiline
              minRows={3}
            />
            <TextField
              label="Visible Until"
              type="datetime-local"
              value={visibleUntil}
              onChange={(e) => setVisibleUntil(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingAnnouncement ? 'Save Changes' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this announcement? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert onClose={() => setSnackbarOpen(false)} severity="info" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AnnouncementsTab;
