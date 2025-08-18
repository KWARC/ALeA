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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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
}

const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({ courseId }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibleUntil, setVisibleUntil] = useState('');

  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedAnnouncements = await getAnnouncement(courseId);
      setAnnouncements(fetchedAnnouncements);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
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
    const defaultDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16); // local datetime-local format
    setVisibleUntil(defaultDate);
    setDialogOpen(true);
  };

  const handleEditOpen = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setTitle(announcement.title);
    setContent(announcement.content);
    setVisibleUntil(new Date(announcement.visibleUntil).toISOString().slice(0, 16));
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || !visibleUntil) return;

    try {
      const date = new Date(visibleUntil);
      const visibleUntilFormatted = date.toISOString().slice(0, 19).replace('T', ' ');

      if (editingAnnouncement) {
        const updateRequest: UpdateAnnouncementRequest = {
          id: editingAnnouncement.id,
          title: title.trim(),
          content: content.trim(),
          visibleUntil: visibleUntilFormatted,
          courseId: courseId,
        };
        await updateAnnouncement(updateRequest);
      } else {
        const createRequest: CreateAnnouncementRequest = {
          courseId: courseId,
          title: title.trim(),
          content: content.trim(),
          visibleUntil: visibleUntilFormatted,
        };
        await createAnnouncement(createRequest);
      }
      handleCloseDialog();
      fetchAnnouncements();
    } catch (error: any) {
      console.error('Failed to save announcement:', error);
      if (error.response) {
        try {
          const details = error.response.data || (await error.response.json?.());
          console.error('Server validation details:', details);
        } catch {}
      }
    }
  };

  const handleDelete = async () => {
    if (announcementToDelete) {
      try {
        await deleteAnnouncement({ id: Number(announcementToDelete), courseId });
        setDeleteDialogOpen(false);
        setAnnouncementToDelete(null);
        fetchAnnouncements();
      } catch (error) {
        console.error('Failed to delete announcement:', error);
      }
    }
  };

  const confirmDelete = (id: string) => {
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
                <TableCell>{new Date(a.createdAt).toLocaleString()}</TableCell>
                <TableCell>{new Date(a.visibleUntil).toLocaleString()}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleEditOpen(a)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => confirmDelete(String(a.id))}>
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
    </Box>
  );
};

export default AnnouncementsTab;
