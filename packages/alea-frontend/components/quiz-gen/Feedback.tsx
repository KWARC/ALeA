import { Feedback, Person, ThumbDown, ThumbUp } from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { getFeedback, postFeedback } from '@alea/spec';
import { useEffect, useRef, useState } from 'react';

const FEEDBACK_REASONS = [
  'Question is unclear',
  'Answer is incorrect',
  'Explanation is not helpful',
  'Too easy or too hard',
];

export const FeedbackSection = ({ problemId }: { problemId: number }) => {
  const [liked, setLiked] = useState<null | boolean>(null);
  const [submitted, setSubmitted] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);

  const toggleReason = (reason: string) => {
    setReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const handleInitialFeedback = async (rating: boolean) => {
    await postFeedback({ problemId, rating });
    setLiked(rating);
    setSubmitted(true);
    setShowFollowUp(rating === false);
  };

  const handleUpdateFeedback = async () => {
    await postFeedback({
      problemId,
      rating: false,
      reasons,
      comments: comment,
    });
    setShowFollowUp(false);
  };

  return (
    <Box mt={3}>
      <Typography variant="subtitle1">Was this question helpful?</Typography>

      <Box display="flex" gap={1} my={1}>
        <IconButton
          onClick={() => handleInitialFeedback(true)}
          color={liked === true ? 'success' : 'default'}
        >
          <ThumbUp />
        </IconButton>
        <IconButton
          onClick={() => handleInitialFeedback(false)}
          color={liked === false ? 'error' : 'default'}
        >
          <ThumbDown />
        </IconButton>
      </Box>

      {submitted && (
        <Typography mt={1} color="green">
          ✅ Thanks for your feedback!
        </Typography>
      )}

      {showFollowUp && (
        <Box mt={1}>
          <Typography variant="subtitle2">Would you like to tell us more?</Typography>
          {FEEDBACK_REASONS.map((reason) => (
            <FormControlLabel
              key={reason}
              control={
                <Checkbox
                  checked={reasons.includes(reason)}
                  onChange={() => toggleReason(reason)}
                />
              }
              label={reason}
            />
          ))}

          <TextField
            fullWidth
            label="Other comments (optional)"
            multiline
            minRows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ mt: 2 }}
          />

          <Button variant="contained" sx={{ mt: 2 }} onClick={handleUpdateFeedback}>
            Submit Additional Feedback
          </Button>
        </Box>
      )}
    </Box>
  );
};

interface FeedbackEntry {
  comments?: string;
  createdAt: string;
  rating: boolean;
  reasons?: string[];
  userId?: string;
}

export function HiddenFeedback({ problemId }: { problemId: number }) {
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastFetchedProblemId = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.shiftKey && e.key === 'F')) return;
      setShow((prev) => !prev);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!show) return;
    if (lastFetchedProblemId.current === problemId) return;
    setFeedbacks([]);
    setLoading(true);
    getFeedback(problemId)
      .then((data) => {
        if (!data) return;
        setFeedbacks(Array.isArray(data) ? data : [data]);
        lastFetchedProblemId.current = problemId;
      })
      .finally(() => setLoading(false));
  }, [problemId, show]);

  if (!show) return null;

  return (
    <Box mt={3}>
      <Typography variant="h6" gutterBottom>
        <Feedback color="primary" sx={{ mr: 1, verticalAlign: 'middle' }} />
        Feedbacks ({loading ? 'Loading...' : feedbacks.length})
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" p={2}>
          <CircularProgress />
        </Box>
      ) : (
        <Box display="flex" gap={2} flexDirection="column">
          {feedbacks.map((fb, index) => (
            <Paper
              key={index}
              elevation={2}
              sx={{
                p: 2,
                borderLeft: '6px solid #007BFF',
                backgroundColor: '#f9f9ff',
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {new Date(fb.createdAt).toLocaleString()}
              </Typography>

              <Typography variant="body2" gutterBottom>
                <strong>Rating:</strong>{' '}
                <Chip
                  label={fb.rating ? 'Helpful' : 'Not Helpful'}
                  color={fb.rating ? 'success' : 'error'}
                  size="small"
                />
              </Typography>

              {fb.reasons?.length > 0 && (
                <Typography variant="body2" gutterBottom>
                  <strong>Reasons:</strong>
                  {fb.reasons.map((reason, i) => (
                    <Chip
                      key={i}
                      label={reason}
                      color="info"
                      size="small"
                      sx={{ mr: 1, mb: 0.5 }}
                    />
                  ))}
                </Typography>
              )}

              {fb.comments && (
                <Typography variant="body2" gutterBottom>
                  <strong>Comments:</strong> {fb.comments}
                </Typography>
              )}

              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <Typography variant="body2">
                  <strong>User:</strong>
                </Typography>
                <Chip
                  label={fb.userId ?? 'Anonymous'}
                  icon={<Person />}
                  color={fb.userId ? 'primary' : 'default'}
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}
