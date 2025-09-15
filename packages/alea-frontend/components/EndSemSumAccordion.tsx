import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  TextField,
  Typography,
} from '@mui/material';
import { generateEndSemesterSummary, QuizWithStatus } from '@alea/spec';
import { SafeHtml } from '@alea/react-utils';
import { downloadFile } from '@alea/utils';
import React, { useEffect, useState } from 'react';

interface EndSemSumAccordionProps {
  courseId: string;
  courseInstance: string;
  quizzes?: QuizWithStatus[];
  setQuizzes?: React.Dispatch<React.SetStateAction<any[]>>;
}

export const EndSemSumAccordion: React.FC<EndSemSumAccordionProps> = ({
  courseId,
  courseInstance,
  quizzes: quizzesProp,
  setQuizzes: setQuizzesProp,
}) => {
  const quizzes = quizzesProp || [];
  const [excludedQuizzes, setExcludedQuizzes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [topN, setTopN] = useState<number>(10);
  useEffect(() => {
    if (quizzesProp) {
      return;
    }
  }, [quizzesProp]);

  const handleQuizToggle = (quizId: string) => {
    setExcludedQuizzes((prev) =>
      prev.includes(quizId) ? prev.filter((id) => id !== quizId) : [...prev, quizId]
    );
  };

  const handleGenerateSummary = async () => {
    try {
      setGenerating(true);
      setError(null);
      setSuccess(null);
      const result = await generateEndSemesterSummary(
        courseId,
        courseInstance,
        excludedQuizzes,
        topN
      );
      if (result?.csvData) {
        downloadFile(result.csvData, `summary_${courseId}_${courseInstance}.csv`, 'text/csv');
        setSuccess(result.message || 'Summary generated and downloaded successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('CSV data not available');
      }
    } catch (err) {
      console.error('Error generating summary:', err);
      setError('Failed to generate end semester summary. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="end-sem-summary-content"
        id="end-sem-summary-header"
      >
        <Typography variant="h6">End Semester Summary</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box>
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

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select quizzes to exclude from the end semester summary calculation:
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {excludedQuizzes.length} of {quizzes.length} quizzes excluded
          </Typography>

          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" p={2}>
              <CircularProgress size={24} />
              <Typography sx={{ ml: 1 }}>Loading quizzes...</Typography>
            </Box>
          ) : quizzes.length === 0 ? (
            <Typography color="text.secondary">No quizzes found for this course.</Typography>
          ) : (
            <>
              <FormGroup sx={{ maxHeight: '300px', overflowY: 'auto', mb: 2 }}>
                {quizzes.map((quiz) => (
                  <FormControlLabel
                    key={quiz.id}
                    control={
                      <Checkbox
                        checked={excludedQuizzes.includes(quiz.id)}
                        onChange={() => handleQuizToggle(quiz.id)}
                        size="small"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" component="div">
                          <SafeHtml html={quiz.title} />
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {quiz.id} • {formatDate(quiz.quizStartTs)}
                        </Typography>
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="body2"
                  color="primary"
                  sx={{
                    mb: 1,
                    fontWeight: 500,
                    fontSize: '1rem',
                    letterSpacing: 0.2,
                  }}
                >
                  Final score is based on top{' '}
                  <TextField
                    type="number"
                    value={topN}
                    onChange={(e) => setTopN(parseInt(e.target.value))}
                    size="small"
                    inputProps={{
                      min: 1,
                      style: { textAlign: 'center', width: 60 },
                    }}
                    sx={{
                      mx: 1,
                      '& input': {
                        fontWeight: 600,
                        fontSize: '1rem',
                        color: 'primary.main',
                        p: '2px 6px',
                        borderRadius: '4px',
                      },
                    }}
                  />
                  quiz scores
                </Typography>
              </Box>

              <Button
                variant="contained"
                startIcon={generating ? <CircularProgress size={16} /> : <DownloadIcon />}
                onClick={handleGenerateSummary}
                disabled={generating}
                fullWidth
              >
                {generating ? 'Generating Summary...' : 'Generate & Download End Semester Summary'}
              </Button>
            </>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};
