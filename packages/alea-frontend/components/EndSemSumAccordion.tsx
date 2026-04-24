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
    <Accordion
      sx={{
        borderRadius: '12px !important',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        border: '1px solid #e0e6ed',
        '&:before': { display: 'none' },
        overflow: 'hidden',
        mb: 3,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: 'primary.main' }} />}
        aria-controls="end-sem-summary-content"
        id="end-sem-summary-header"
        sx={{
          backgroundColor: '#f8fafd',
          borderBottom: '1px solid #e0e6ed',
          minHeight: '48px !important',
          '& .MuiAccordionSummary-content': {
            my: 1,
          },
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: '#1a335d',
            fontWeight: 700,
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: 6,
              height: 20,
              backgroundColor: 'primary.main',
              borderRadius: 4,
              mr: 1,
            }}
          />
          End Semester Summary
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 2, backgroundColor: '#ffffff' }}>
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

          <Typography
            variant="body2"
            sx={{ color: '#4a5568', mb: 1, display: 'block' }}
          >
            Select <strong>quizzes</strong> to exclude from the{' '}
            <span style={{ color: '#2b6cb0', fontWeight: 600 }}>
              end semester summary
            </span>{' '}
            calculation:
          </Typography>

          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              px: 1.2,
              py: 0.3,
              borderRadius: '20px',
              backgroundColor: excludedQuizzes.length > 0 ? '#fff5f5' : '#f0fff4',
              border: `1px solid ${excludedQuizzes.length > 0 ? '#feb2b2' : '#c6f6d5'}`,
              mb: 2,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: excludedQuizzes.length > 0 ? '#c53030' : '#2f855a',
              }}
            >
              {excludedQuizzes.length} of {quizzes.length} quizzes excluded
            </Typography>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" p={4}>
              <CircularProgress size={28} />
              <Typography sx={{ ml: 2, color: 'text.secondary' }}>Loading quizzes...</Typography>
            </Box>
          ) : quizzes.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 2,
                px: 2,
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #edf2f7',
              }}
            >
              <Typography variant="body2" sx={{ color: '#718096', fontStyle: 'italic' }}>
                No quizzes have been created for this course yet.
              </Typography>
            </Box>
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
