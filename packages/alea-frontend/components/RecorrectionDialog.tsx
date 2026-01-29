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
import { FTMLProblemWithSolution, recorrectQuiz } from '@alea/spec';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { getLocaleObject } from '../lang/utils';
import ProblemIdPreview from './ProblemIdPreview';

interface RecorrectionChange {
  gradingId: number;
  problemId: string;
  oldPoints: number;
  newPoints: number;
  studentId?: string;
}

interface RecorrectionDialogProps {
  open: boolean;
  onClose: () => void;
  quizId: string;
  courseId: string;
  courseTerm: string;
}

export const RecorrectionDialog: React.FC<RecorrectionDialogProps> = ({
  open,
  onClose,
  quizId,
  courseId,
  courseTerm,
}) => {
  const router = useRouter();
  const { recorrection: t } = getLocaleObject(router);
  const [isLoading, setIsLoading] = useState(false);
  const [isDryRun, setIsDryRun] = useState(true);
  const [changes, setChanges] = useState<RecorrectionChange[]>([]);
  const [titles, setTitles] = useState<
    Record<string, { title_html: string } | FTMLProblemWithSolution>
  >({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [changedCount, setChangedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      handlePreview();
    }
  }, [open]);

  const handlePreview = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const result = await recorrectQuiz(quizId, courseId, courseTerm, true, reasons);
      setChanges(result.changes);
      setChangedCount(result.changedCount);
      setTitles(result.problems);
      setIsDryRun(true);
      console.log('preview result', result);
    } catch (err) {
      setError('Failed to preview recorrection: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const result = await recorrectQuiz(quizId, courseId, courseTerm, false, reasons);
      setChanges(result.changes);
      setChangedCount(result.changedCount);
      setIsDryRun(false);
      setSuccess(true);
    } catch (err) {
      setError('Failed to apply recorrection: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (success) {
      window.location.reload();
    } else {
      onClose();
    }
  };

  //const problemIds = getParamFromUri(problemId, d);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{t.quizRecorrection}</DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <DialogContentText color="error">{error}</DialogContentText>
        ) : success ? (
          <DialogContentText sx={{ color: 'green' }}>
            Recorrection successfully applied! {changedCount} submissions were updated.
          </DialogContentText>
        ) : changes.length > 0 ? (
          <>
            <DialogContentText>
              <Typography variant="subtitle1" color="primary" fontWeight="bold" gutterBottom>
                {t.previewRecorrection}
              </Typography>
              {isDryRun
                ? `${changedCount} submissions will be updated if you apply this recorrection:`
                : `${changedCount} submissions have been updated:`}
            </DialogContentText>
            <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                      {t.problemId}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                      {t.recorrectionReason}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.from(new Set(changes.map((change) => change.problemId))).map(
                    (problemId) => {
                      const problem = titles[problemId];
                      const title =
                        'title_html' in problem && typeof problem.title_html === 'string'
                          ? problem.title_html
                          : problemId;
                      return (
                        <TableRow key={problemId}>
                          <TableCell
                            sx={{
                              verticalAlign: 'middle',
                              fontWeight: 500,
                              maxWidth: 300,
                              wordBreak: 'break-word',
                            }}
                          >
                            {title} <ProblemIdPreview uri={problemId} param="d" />
                          </TableCell>
                          <TableCell sx={{ verticalAlign: 'middle', maxWidth: 400 }}>
                            <input
                              type="text"
                              placeholder={t.recorrectionReasonPlaceholder}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '14px',
                                background: '#fafafa',
                                boxSizing: 'border-box',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                              }}
                              value={reasons[problemId] || ''}
                              onChange={(e) => {
                                setReasons((prev) => ({
                                  ...prev,
                                  [problemId]: e.target.value,
                                }));
                              }}
                              onFocus={(e) => (e.target.style.borderColor = 'primary.10')}
                              onBlur={(e) => (e.target.style.borderColor = '#ccc')}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    }
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                      {t.problemId}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}
                    >
                      {t.oldpoints}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}
                    >
                      {t.newpoints}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}
                    >
                      {t.numberOfEntries}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.from(
                    changes
                      .reduce((acc, change) => {
                        const key = `${change.problemId}-${change.oldPoints}-${change.newPoints}`;
                        if (!acc.has(key)) {
                          const count = changes.filter(
                            (c) =>
                              c.problemId === change.problemId &&
                              c.oldPoints === change.oldPoints &&
                              c.newPoints === change.newPoints
                          ).length;
                          acc.set(key, { ...change, entryCount: count });
                        }
                        return acc;
                      }, new Map<string, { entryCount: number } & RecorrectionChange>())
                      .values()
                  ).map((change) => (
                    <TableRow
                      key={change.problemId}
                      sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}
                    >
                      <TableCell sx={{ fontWeight: 500, maxWidth: 300, wordBreak: 'break-word' }}>
                        {(() => {
                          const problem = titles[change.problemId];
                          const title =
                            problem &&
                            'title_html' in problem &&
                            typeof problem.title_html === 'string'
                              ? problem.title_html
                              : change.problemId;
                          return (
                            <>
                              {title} <ProblemIdPreview uri={change.problemId} param="d" />
                            </>
                          );
                        })()}
                      </TableCell>
                      <TableCell align="right" sx={{ color: '#b71c1c', fontWeight: 500 }}>
                        {change.oldPoints.toFixed(2)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: '#1b5e20', fontWeight: 500 }}>
                        {change.newPoints.toFixed(2)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>
                        {change.entryCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : changes.length === 0 && changedCount === 0 ? (
          <DialogContentText>{t.noChangetoApply}</DialogContentText>
        ) : (
          <DialogContentText>{t.loadingPreviewOfChanges}</DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          {success ? 'Close' : 'Cancel'}
        </Button>
        {!success && changes.length > 0 && isDryRun && (
          <Button onClick={handleApply} color="primary" variant="contained" disabled={isLoading}>
            {t.ApplyRecorrection}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
