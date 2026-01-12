import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { checkPendingRecorrections } from '@alea/spec';
import Link from 'next/link';
import React, { useState } from 'react';
import { GradingDbData } from '../pages/api/quiz/recorrect';
import ProblemIdPreview from './ProblemIdPreview';

interface RecorrectionQuizData {
  courseId: string;
  courseTerm: string;
  quizId: string;
  changes: GradingDbData[];
}
interface RecorrectionData {
  totalChanges: number;
  changesByQuiz: RecorrectionQuizData[];
  missingProblemUri: Record<string, number>;
}

const RecorrectionChecker: React.FC = () => {
  const [recorrectionData, setRecorrectionData] = useState<RecorrectionData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set());
  const [titles, setTitles] = useState<Record<string, { title_html: string }>>({});

  const handleCheckRecorrectionClick = async () => {
    try {
      setIsLoading(true);
      setError('');

      const data = await checkPendingRecorrections();
      setRecorrectionData(data);
      setDialogOpen(true);
      if (data.problems) {
        setTitles(data.problems);
      } else {
        setTitles({});
      }
    } catch (e) {
      console.error('Error checking recorrection:', e);
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setRecorrectionData(null);
    setError('');
    setCopiedLinks(new Set());
  };

  const formatQuizLink = (courseId: string, courseTerm: string, quizId: string, institutionId: string = 'FAU') => {
    const instanceId = courseTerm || 'latest';
    return `/${institutionId}/${courseId}/${instanceId}/instructor-dash?tab=quiz-dashboard&quizId=${quizId}`;
  };

  const handleCopyLink = (courseId: string, courseTerm: string, quizId: string) => {
    const link = formatQuizLink(courseId, courseTerm, quizId);
    const fullUrl = `${window.location.origin}${link}`;
    const linkKey = `${courseId}-${courseTerm}-${quizId}`;

    navigator.clipboard
      .writeText(fullUrl)
      .then(() => {
        setCopiedLinks((prev) => new Set(prev).add(linkKey));
        setTimeout(() => {
          setCopiedLinks((prev) => {
            const newSet = new Set(prev);
            newSet.delete(linkKey);
            return newSet;
          });
        }, 2000);
      })
      .catch((err) => {
        console.error('Failed to copy link:', err);
      });
  };

  return (
    <>
      <Button
        sx={{
          display: 'flex',
          alignItems: 'center',
          margin: '10px auto',
        }}
        variant="contained"
        color="primary"
        disabled={isLoading}
        onClick={handleCheckRecorrectionClick}
        startIcon={isLoading ? <CircularProgress size={20} /> : null}
      >
        {isLoading ? 'Checking...' : 'Check Pending Recorrection'}
      </Button>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '400px' },
        }}
      >
        <DialogTitle>Pending Recorrections Analysis</DialogTitle>

        <DialogContent>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              Error: {error}
            </Typography>
          )}

          {recorrectionData && (
            <>
              <DialogContentText sx={{ mb: 3 }}>
                <Typography variant="h6" component="span">
                  Total changes needed: {recorrectionData.totalChanges}
                </Typography>
              </DialogContentText>

              {recorrectionData.totalChanges === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="primary">
                    No corrections needed
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Course ID</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Quiz ID</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Question Name/URI</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Link to Quiz + Entries</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recorrectionData.changesByQuiz.map((item) =>
                        Object.entries(
                          item.changes.reduce((acc, change) => {
                            if (!acc[change.problemId]) acc[change.problemId] = [];
                            acc[change.problemId].push(change);
                            return acc;
                          }, {} as Record<string, GradingDbData[]>)
                        ).map(([problemId, problemChanges]) => (
                          <TableRow
                            key={`${item.courseId}-${item.courseTerm}-${item.quizId}-${problemId}`}
                          >
                            <TableCell>{item.courseId}</TableCell>
                            <TableCell>{item.quizId}</TableCell>
                            <TableCell>
                              {(() => {
                                const problem = titles[problemId];
                                const title =
                                  problem &&
                                  'title_html' in problem &&
                                  typeof problem.title_html === 'string'
                                    ? problem.title_html
                                    : problemId;
                                return (
                                  <>
                                    {title} <ProblemIdPreview uri={problemId} param="d" />
                                  </>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Link
                                  href={formatQuizLink(item.courseId, item.courseTerm, item.quizId)}
                                  passHref
                                >
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    component="a"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    View Quiz ({problemChanges.length} entries)
                                  </Button>
                                </Link>
                                <Box
                                  component="span"
                                  sx={{
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    ml: 1,
                                    textDecoration: 'underline dotted',
                                    '&:hover': { color: '#1976d2' },
                                    fontSize: 14,
                                  }}
                                  onClick={() =>
                                    handleCopyLink(item.courseId, item.courseTerm, item.quizId)
                                  }
                                >
                                  {copiedLinks.has(
                                    `${item.courseId}-${item.courseTerm}-${item.quizId}`
                                  ) ? (
                                    <Typography
                                      component="span"
                                      sx={{ fontSize: 12, fontWeight: 500, color: '#4caf50' }}
                                    >
                                      Copied
                                    </Typography>
                                  ) : (
                                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                                  )}
                                </Box>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RecorrectionChecker;
