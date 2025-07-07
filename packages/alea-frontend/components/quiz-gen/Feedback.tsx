import { ThumbDown, ThumbUp } from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { postFeedback } from '@stex-react/api';
import { useState } from 'react';

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
