import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { createExcused, deleteExcused, getExcused } from '@stex-react/spec';
import { useEffect, useState } from 'react';

export function ExcusedAccordion({ quizId, courseId, courseInstance }) {
  const [excusedList, setExcusedList] = useState([]);
  const [newUserId, setNewUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function fetchExcused() {
    setLoading(true);
    setError('');
    try {
      const data = await getExcused(quizId, courseId, courseInstance);
      setExcusedList(Array.isArray(data) ? data : [data]);
    } catch (err) {
      setError('Failed to fetch excused students');
      console.error('Error fetching excused students:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (quizId !== 'New') fetchExcused();
  }, [quizId]);

  async function handleCreate() {
    if (!newUserId.trim()) {
      setError('Please enter a valid User ID');
      return;
    }

    setCreating(true);
    setError('');
    setSuccess('');

    try {
      await createExcused(quizId, newUserId.trim(), courseId, courseInstance);
      setNewUserId('');
      setSuccess(`Student ${newUserId.trim()} added to excused list`);
      await fetchExcused();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error creating excused:', err);
      if (err.response && typeof err.response.data === 'string') {
        setError(err.response.data);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to add student to excused list');
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(userId) {
    setError('');
    try {
      await deleteExcused({ userId, quizId, courseId, courseInstance });
      setSuccess(`Student ${userId} removed from excused list`);
      await fetchExcused();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to remove student from excused list');
      console.error('Error deleting excused:', err);
    }
  }

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleCreate();
    }
  };

  return (
    <Accordion
      sx={{
        boxShadow: 2,
        '&:before': { display: 'none' },
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          '& .MuiAccordionSummary-content': {
            alignItems: 'center',
            gap: 1,
          },
          '&:hover': {
            backgroundColor: 'primary.dark',
          },
        }}
      >
        <SchoolIcon />
        <Typography variant="h6" component="div">
          Excused Students
        </Typography>
        {excusedList.length > 0 && (
          <Chip
            label={excusedList.length}
            size="small"
            sx={{
              ml: 2,
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'inherit',
            }}
          />
        )}
      </AccordionSummary>

      <AccordionDetails sx={{ p: 3 }}>
        <Paper elevation={1} sx={{ p: 2, mb: 3, backgroundColor: 'grey.50' }}>
          <Typography variant="subtitle2" gutterBottom color="text.secondary">
            Add New Excused Student
          </Typography>
          <Box display="flex" gap={2} alignItems="flex-start">
            <TextField
              label="Student User ID"
              size="small"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={creating}
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={creating || !newUserId.trim()}
              startIcon={creating ? <CircularProgress size={16} /> : <AddIcon />}
              sx={{ minWidth: 120 }}
            >
              {creating ? 'Adding...' : 'Add Student'}
            </Button>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Divider sx={{ mb: 2 }} />

        <Typography variant="subtitle2" gutterBottom color="text.secondary">
          Currently Excused Students ({excusedList.length})
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Loading excused students...
            </Typography>
          </Box>
        ) : excusedList.length === 0 ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            py={4}
            sx={{
              backgroundColor: 'grey.50',
              borderRadius: 2,
              border: '2px dashed',
              borderColor: 'grey.300',
            }}
          >
            <SchoolIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No students are currently excused from this quiz
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
            {excusedList.map((e, idx) => (
              <Paper
                key={e.userId + '-' + idx}
                elevation={0}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  mb: 1,
                  border: 1,
                  borderColor: 'grey.200',
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'grey.50',
                    borderColor: 'primary.main',
                  },
                }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <PersonIcon color="primary" />
                  <Typography variant="body1" fontWeight="medium">
                    {e.userId}
                  </Typography>
                </Box>
                <IconButton
                  onClick={() => handleDelete(e.userId)}
                  size="small"
                  color="error"
                  sx={{
                    '&:hover': {
                      backgroundColor: 'error.lighter',
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Paper>
            ))}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
