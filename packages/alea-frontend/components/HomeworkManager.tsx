import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar
} from '@mui/material';
import { useEffect, useState } from 'react';

import { FTML } from '@kwarc/ftml-viewer';
import {
  createHomework,
  CreateHomeworkRequest,
  deleteHomework,
  FTMLProblemWithSolution,
  getHomeworkList,
  getHomeworkStats,
  HomeworkInfo,
  HomeworkStatsInfo,
  HomeworkStub,
  updateHomework,
  UpdateHomeworkRequest,
} from '@alea/spec';
import dayjs from 'dayjs';
import { useCurrentTermContext } from '../contexts/CurrentTermContext';
import HomeworkForm from './HomeworkForm';
import HomeworkList from './HomeworkList';
import HomeworkStats from './HomeworkState';

function timestampNow() {
  return new Date();
}

function timestampEOD() {
  const date = new Date();
  date.setHours(23, 59, 59);
  return date;
}

const HomeworkManager = ({ courseId }) => {
  const { currentTerm, loading: termLoading, setCourseId } = useCurrentTermContext();
  
  useEffect(() => {
    if (courseId) {
      setCourseId(courseId);
    }
  }, [courseId, setCourseId]);
  const [homeworks, setHomeworks] = useState<HomeworkStub[]>([]);
  const [stats, setStats] = useState<HomeworkStatsInfo | null>(null);
  const [id, setId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [problems, setProblems] = useState<Record<string, FTMLProblemWithSolution>>({});
  const [givenTs, setGivenTs] = useState(timestampNow());
  const [dueTs, setDueTs] = useState(timestampEOD());
  const [feedbackReleaseTs, setFeedbackReleaseTs] = useState(timestampEOD());
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [message, setMessage] = useState('');
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedHomeworkId, setSelectedHomeworkId] = useState<number | null>(null);
  const [css, setCss] = useState<FTML.CSS[]>([]);

  const getHomeworks = async () => {
    try {
      const homeworkList = await getHomeworkList(courseId);
      setHomeworks(homeworkList);
      setSelectedHomeworkId(homeworkList[0]?.id);
    } catch (error) {
      console.error('An unexpected error occurred', error);
      setMessage('An error occured');
    }
    setOpenSnackbar(true);
  };
  const getStats = async (homeworkId: string) => {
    try {
      const homeworkList = await getHomeworkStats(courseId, homeworkId);
      setStats(homeworkList);
    } catch (error) {
      console.error('An unexpected error occurred', error);
      setMessage('An error occured');
    }
  };

  useEffect(() => {
    if (view === 'list') {
      getHomeworks();
    }
  }, [view, courseId]);

  const handleSave = async () => {
    const body = {
      givenTs: dayjs(givenTs).format('YYYY-MM-DDTHH:mm:ssZ'),
      dueTs: dayjs(dueTs).format('YYYY-MM-DDTHH:mm:ssZ'),
      feedbackReleaseTs: dayjs(feedbackReleaseTs).format('YYYY-MM-DDTHH:mm:ssZ'),
      title,
      problems,
      css,
      ...(id ? { id } : {}),
    };

    try {
      let response;
      if (id) {
        const updateRequest: UpdateHomeworkRequest = { ...body, id };
        response = await updateHomework(updateRequest);
      } else {
        const createRequest: CreateHomeworkRequest = {
          ...body,
          courseId,
          courseInstance: currentTerm,
        };
        response = await createHomework(createRequest);
      }
      setMessage(response.data.message);
      setOpenSnackbar(true);
      resetForm(false);
      getHomeworks();
    } catch (error) {
      console.error('Error details:', error);
      setMessage(error.response?.data?.message || 'An error occurred');
      setOpenSnackbar(true);
    }
  };

  const handleEdit = (homework: HomeworkInfo) => {
    setId(homework.id);
    setGivenTs(new Date(homework.givenTs));
    setDueTs(new Date(homework.dueTs));
    setFeedbackReleaseTs(new Date(homework.feedbackReleaseTs));
    setTitle(homework.title);
    setProblems(homework.problems);
    setView('edit');
  };
  const handleShow = (homework: HomeworkInfo) => {
    setId(homework.id);
    getStats(homework.id.toString());
    setTitle(homework.title);
    setSelectedHomeworkId(homework.id);
  };

  const handleDelete = async () => {
    if (selectedHomeworkId) {
      try {
        const response = await deleteHomework(selectedHomeworkId, courseId);
        setMessage(response.message);
        setOpenSnackbar(true);
        getHomeworks();
      } catch (error) {
        setMessage(error?.response?.data?.message || 'An error occurred');
        setOpenSnackbar(true);
      }
    }
    setDeleteDialogOpen(false);
  };

  const confirmDelete = (homeworkId: number) => {
    setSelectedHomeworkId(homeworkId);
    setDeleteDialogOpen(true);
  };

  const resetForm = (isCancelled = true) => {
    setId(null);
    setTitle('');
    setProblems({});
    setGivenTs(timestampNow());
    setDueTs(timestampEOD());
    setFeedbackReleaseTs(timestampEOD());
    setView('list');
    if (isCancelled) {
      if (id) {
        setMessage('Homework updation cancelled');
      } else {
        setMessage('Homework creation cancelled');
      }
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
    setMessage('');
  };

  return (
    <Box maxWidth="lg" sx={{ m: '0 auto', p: '0 16px' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mt: 2,
          p: 3,
          border: '1px solid #ccc',
          borderRadius: 2,
        }}
      >
        {view === 'list' && (
          <>
            <HomeworkList
              homeworkStubs={homeworks}
              selectedHomeworkId={selectedHomeworkId}
              handleEdit={handleEdit}
              handleShow={handleShow}
              confirmDelete={confirmDelete}
              onCreate={() => setView('create')}
            />
            <HomeworkStats title={title} stats={stats} />
          </>
        )}
        {view === 'create' || view === 'edit' ? (
          <HomeworkForm
            id={id}
            title={title}
            givenTs={givenTs}
            dueTs={dueTs}
            setCss={setCss}
            feedbackReleaseTs={feedbackReleaseTs}
            setGivenTs={(givenTs) => {
              setGivenTs(givenTs);
              if (dueTs < givenTs) setDueTs(givenTs);
              if (feedbackReleaseTs < givenTs) setFeedbackReleaseTs(givenTs);
            }}
            setDueTs={(dueTs) => {
              if (dueTs < givenTs) setGivenTs(dueTs);
              setDueTs(dueTs);
              if (feedbackReleaseTs < dueTs) setFeedbackReleaseTs(dueTs);
            }}
            setFeedbackReleaseTs={(feedbackReleaseTs) => {
              if (feedbackReleaseTs < givenTs) setGivenTs(feedbackReleaseTs);
              if (feedbackReleaseTs < dueTs) setDueTs(feedbackReleaseTs);
              setFeedbackReleaseTs(feedbackReleaseTs);
            }}
            setTitle={setTitle}
            problems={problems}
            setProblems={setProblems}
            handleSave={handleSave}
            resetForm={resetForm}
          />
        ) : null}
        <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
            {message}
          </Alert>
        </Snackbar>

        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          aria-labelledby="delete-confirmation-dialog"
        >
          <DialogTitle id="delete-confirmation-dialog">Confirm Delete</DialogTitle>
          <DialogContent>
            <DialogContentText>Are you sure you want to delete this homework?</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
              Cancel
            </Button>
            <Button onClick={handleDelete} color="error">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default HomeworkManager;
