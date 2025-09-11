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
  Paper,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import {
  createAnnouncement,
  CreateAnnouncementRequest,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  UpdateAnnouncementRequest,
} from '@stex-react/spec';
import { Announcement } from '@stex-react/spec';
import { useRouter } from 'next/router';
import { getLocaleObject } from 'packages/alea-frontend/lang/utils';

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

  const router = useRouter();
  const { courseMetadata: t } = getLocaleObject(router);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedAnnouncements = await getAnnouncements(courseId, instanceId);
      setAnnouncements(fetchedAnnouncements);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
      setSnackbarMessage(t.snackbarAnnouncementsFetchFailed);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [courseId, instanceId, t]);

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
      setSnackbarMessage(`${t.fieldTitle}, ${t.fieldContent}, ${t.fieldVisibleUntil} ${'are required.'}`);
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
          instanceId: instanceId,
        };
        await updateAnnouncement(updateRequest);
      } else {
        const createRequest: CreateAnnouncementRequest = {
          courseId: courseId,
          title: title.trim(),
          content: content.trim(),
          visibleUntil: visibleUntilSQL,
          instanceId: instanceId,
        };
        await createAnnouncement(createRequest);
      }
      handleCloseDialog();
      fetchAnnouncements();
      setSnackbarMessage(t.snackbarAnnouncementSaved);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to save announcement:', error);
      setSnackbarMessage(t.snackbarAnnouncementSaveFailed);
      setSnackbarOpen(true);
    }
  };
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
        setSnackbarMessage(t.snackbarAnnouncementDeleted);
        setSnackbarOpen(true);
      } catch (error) {
        console.error('Failed to delete announcement:', error);
        setSnackbarMessage(t.snackbarAnnouncementDeleteFailed);
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

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight="bold" color="primary">
          {t.announcementsHeader.replace('{{courseId}}', courseId)}
        </Typography>
        <Button
          variant="contained"
          size="small"
          color="primary"
          onClick={handleCreateOpen}
          sx={{
            px: 2,
            py: 1,
            boxShadow: 2,
          }}
        >
          {t.newAnnouncementButton}
        </Button>
      </Box>

      <Table
        size="small"
        sx={{
          mt: 1,
          backgroundColor: '#fafbfc',
          '& thead': { backgroundColor: '#f5f7fa' },
          '& tbody tr:hover': { backgroundColor: '#f0f4ff' },
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <TableHead>
          <TableRow sx={{ '& > th': { fontWeight: 'bold' } }}>
            <TableCell>{t.tableCourseId}</TableCell>
            <TableCell>{t.tableInstructor}</TableCell>
            <TableCell>{t.tableTitle}</TableCell>
            <TableCell>{t.tableContent}</TableCell>
            <TableCell>{t.tableCreatedAt}</TableCell>
            <TableCell>{t.tableVisibleUntil}</TableCell>
            <TableCell>{t.actions}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {announcements
            .sort((a, b) => a.id - b.id)
            .map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.courseId}</TableCell>
                <TableCell>{a.instructorId}</TableCell>
                <TableCell>{a.title}</TableCell>
                <TableCell
                  style={{
                    maxWidth: 220,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Tooltip title={a.content}>
                    <span>{a.content}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>{dayjs(a.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                <TableCell>{dayjs(a.visibleUntil).format('YYYY-MM-DD HH:mm')}</TableCell>
                <TableCell>
                  <Tooltip title={t.edit}>
                    <IconButton size="small" onClick={() => handleEditOpen(a)}>
                      <EditIcon fontSize="small" color="primary" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t.delete}>
                    <IconButton size="small" onClick={() => confirmDelete(a.id)}>
                      <DeleteIcon fontSize="small" color="error" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {editingAnnouncement ? t.dialogEditAnnouncementTitle : t.dialogNewAnnouncementTitle}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t.fieldTitle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label={t.fieldContent}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              required
            />
            <TextField
              label={t.fieldVisibleUntil}
              type="datetime-local"
              value={visibleUntil}
              onChange={(e) => setVisibleUntil(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t.cancel}</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingAnnouncement ? t.saveChanges : t.create}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle color="error" sx={{ fontWeight: 'bold' }}>
          {t.confirmDeleteAnnouncementTitle}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t.confirmDeleteAnnouncementMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t.cancel}</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            {t.delete}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert onClose={() => setSnackbarOpen(false)} severity="info" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default AnnouncementsTab;
