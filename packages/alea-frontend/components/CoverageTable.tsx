import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { getAllQuizzes, QuizWithStatus } from '@stex-react/api';
import { CURRENT_TERM } from '@stex-react/utils';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import QuizHandler from './QuizHandler';
const courseTerm = CURRENT_TERM;

export interface CoverageEntry {
  id: string;
  timestamp_ms: number;
  sectionName: string;
  sectionUri: string;
  targetSectionName: string;
  targetSectionUri: string;
  clipId: string;
  isQuizScheduled: boolean;
  slideUri: string;
  slideNumber?: number;
}

interface QuizMatchMap {
  [timestamp_ms: number]: QuizWithStatus | null;
}

interface CoverageTableProps {
  courseId: string;
  entries: CoverageEntry[];
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  sectionList: Array<{ id: string; title: string; uri: string }>;
}

interface CoverageRowProps {
  item: CoverageEntry;
  quizMatch: QuizWithStatus | null;
  originalIndex: number;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

const formatSectionWithSlide = (sectionName: string, slideNumber?: number, slideUri?: string) => {
  if (!sectionName) return <i>-</i>;

  if (slideNumber && slideUri) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SlideshowIcon sx={{ fontSize: 16, color: 'success.main' }} />
        <Typography variant="body2">
          <strong>Slide {slideNumber}</strong> of {sectionName}
        </Typography>
      </Box>
    );
  } else {
    return <Typography variant="body2">{sectionName}</Typography>;
  }
};

function CoverageRow({ item, quizMatch, originalIndex, onEdit, onDelete }: CoverageRowProps) {
  const now = dayjs();
  const itemDate = dayjs(item.timestamp_ms);
  const isPast = itemDate.isBefore(now, 'day');
  const isFuture = itemDate.isAfter(now, 'day');
  const isToday = itemDate.isSame(now, 'day');
  const isNoSection = !item.sectionName || item.sectionName.trim() === '';
  const shouldHighlightNoSection = isNoSection && (isPast || isToday);

  let backgroundColor = 'inherit';
  let hoverBackgroundColor = 'action.hover';
  if (shouldHighlightNoSection) {
    backgroundColor = 'rgba(244, 67, 54, 0.15)';
    hoverBackgroundColor = 'rgba(244, 67, 54, 0.20)';
  } else if (isPast) {
    backgroundColor = 'rgba(237, 247, 237, 0.5)';
    hoverBackgroundColor = 'rgba(237, 247, 237, 0.7)';
  } else if (isFuture) {
    backgroundColor = 'rgba(255, 243, 224, 0.5)';
    hoverBackgroundColor = 'rgba(255, 243, 224, 0.7)';
  }

  return (
    <TableRow
      sx={{
        backgroundColor,
        '&:hover': {
          backgroundColor: hoverBackgroundColor,
        },
      }}
    >
      <TableCell>
        <Typography
          variant="body2"
          fontWeight="medium"
          sx={{
            color: isPast ? 'success.main' : isFuture ? 'warning.main' : 'text.primary',
            fontWeight: 'bold',
          }}
        >
          {itemDate.format('YYYY-MM-DD')}
        </Typography>
      </TableCell>
      <TableCell
        sx={{
          maxWidth: '250px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <Tooltip
          title={
            item.sectionName ||
            (shouldHighlightNoSection ? 'No Section - Please fill this field' : 'No Section')
          }
        >
          {shouldHighlightNoSection ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  color: 'error.main',
                  fontStyle: 'italic',
                  fontWeight: 'bold',
                }}
              >
                Update pending
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'error.main',
                  animation: 'blink 1.5s infinite',
                }}
              >
                ⚠️
              </Typography>
            </Box>
          ) : (
            formatSectionWithSlide(item.sectionName, item.slideNumber, item.slideUri)
          )}
        </Tooltip>
      </TableCell>
      <TableCell
        sx={{
          maxWidth: '200px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <Tooltip title={item.targetSectionName || 'No Target'}>
          <Typography variant="body2">{item.targetSectionName || <i>-</i>}</Typography>
        </Tooltip>
      </TableCell>
      <TableCell>
        {item.clipId?.length ? (
          <Button
            variant="outlined"
            size="small"
            href={`https://fau.tv/clip/id/${item.clipId}`}
            target="_blank"
            rel="noreferrer"
            startIcon={<OpenInNewIcon />}
            sx={{ textTransform: 'none' }}
          >
            {item.clipId}
          </Button>
        ) : (
          <Typography variant="body2" color="text.secondary">
            <i>-</i>
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <QuizHandler currentEntry={item} quiz={quizMatch} />
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            size="small"
            color="primary"
            onClick={() => onEdit(originalIndex)}
            sx={{
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
              },
              transition: 'all 0.2s',
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => onDelete(originalIndex)}
            sx={{
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
              },
              transition: 'all 0.2s',
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </TableCell>
    </TableRow>
  );
}

function calculateLectureProgress(
  entries: CoverageEntry[],
  sectionList: Array<{ title: string; uri: string }>
) {
  const normalize = (s: string) => s?.trim().toLowerCase() || '';
  const sectionToIndex = new Map(sectionList.map((s, i) => [normalize(s.title), i]));
  const targetSectionsWithIndices = entries
    .map((entry) => {
      const normalizedName = normalize(entry.targetSectionName);
      const index = sectionToIndex.get(normalizedName);
      return index !== undefined ? { targetSectionName: entry.targetSectionName, index } : null;
    })
    .filter(Boolean) as Array<{ targetSectionName: string; index: number }>;
  let lastFilledSectionEntry: CoverageEntry | null = null;
  for (const entry of entries) {
    if (entry.sectionName && entry.sectionName.trim() !== '') {
      lastFilledSectionEntry = entry;
    }
  }
  const lastFilledSectionIdx =
    sectionToIndex.get(normalize(lastFilledSectionEntry?.sectionName)) ?? -1;

  const lastEligibleTargetSectionIdx =
    sectionToIndex.get(normalize(lastFilledSectionEntry?.targetSectionName)) ?? -1;
  let progressStatus = '';
  if (lastEligibleTargetSectionIdx !== -1 && lastFilledSectionIdx !== -1) {
    let progressCovered = 0;
    let totalTarget = 0;
    for (const s of targetSectionsWithIndices) {
      if (s.index <= lastFilledSectionIdx) progressCovered++;
      if (s.index <= lastEligibleTargetSectionIdx) totalTarget++;
    }
    const isLastSectionInTargets = targetSectionsWithIndices.some(
      (s) => s.index === lastFilledSectionIdx
    );
    if (!isLastSectionInTargets) {
      progressCovered += 0.5;
    }
    const difference = progressCovered - totalTarget;
    const absDiff = Math.abs(difference);
    let description = '';
    const roundedBottom = Math.floor(absDiff);
    const roundedUp = Math.ceil(absDiff);

    const fractionalPart = absDiff - roundedBottom;
    if (absDiff === 0) {
      description = 'on track';
    } else if (absDiff < 1) {
      description = difference > 0 ? 'slightly ahead' : 'slightly behind';
    } else if (fractionalPart < 0.9 && fractionalPart > 0) {
      const lecturesCount = difference > 0 ? roundedBottom : roundedUp;
      description = `Over ${lecturesCount} lecture${lecturesCount !== 1 ? 's' : ''} ${
        difference > 0 ? 'ahead' : 'behind'
      } `;
    } else {
      description = ` ${Math.round(absDiff)} lectures ${difference > 0 ? 'ahead' : 'behind'}`;
    }

    progressStatus = description;
  }
  return progressStatus || 'Progress unknown';
}

const getProgressStatusColor = (status: string) => {
  if (status.includes('ahead')) return 'success.main';
  if (status.includes('behind')) return 'error.main';
  if (status.includes('on track')) return 'success.main';
  return 'info.main';
};

const getProgressIcon = (status: string) => {
  if (status.includes('ahead')) return '🚀';
  if (status.includes('behind')) return '⚠️';
  if (status.includes('on track')) return '✅';
  return '📊';
};

export function CoverageTable({ courseId,entries, onEdit, onDelete, sectionList }: CoverageTableProps) {
  const status = calculateLectureProgress(entries, sectionList);
  const sortedEntries = [...entries].sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  const [quizMatchMap, setQuizMatchMap] = useState<QuizMatchMap>({});

  useEffect(() => {
    async function fetchQuizzes() {
      try {
        const allQuizzes = await getAllQuizzes(courseId, courseTerm);
        const map: QuizMatchMap = {};
        entries.forEach((entry) => {
          const match = allQuizzes.find(
            (quiz) => Math.abs(quiz.quizStartTs - entry.timestamp_ms) < 12 * 60 * 60 * 1000
          );
          map[entry.timestamp_ms] = match || null;
        });
        setQuizMatchMap(map);
      } catch (err) {
        console.error('Error fetching quizzes:', err);
      }
    }

    fetchQuizzes();
  }, [courseId]);
  
  return (
    <Box>
      <Paper 
        elevation={3} 
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(25, 118, 210, 0.1) 100%)',
          border: `2px solid ${getProgressStatusColor(status)}`,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${getProgressStatusColor(status)}, transparent)`,
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              fontSize: '2rem',
              animation: status.includes('behind') ? 'pulse 2s infinite' : 'none',
            }}
          >
            {getProgressIcon(status)}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 'bold',
                color: 'text.primary',
                mb: 0.5
              }}
            >
              Lecture Progress Status
            </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 'bold',
                color: getProgressStatusColor(status),
                textTransform: 'capitalize',
                letterSpacing: '0.5px'
              }}
            >
              {status}
            </Typography>
          </Box>
          <Box
            sx={{
              minWidth: '60px',
              height: '60px',
              borderRadius: '50%',
              bgcolor: getProgressStatusColor(status),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.1,
              fontSize: '1.5rem'
            }}
          >
            📚
          </Box>
        </Box>
      </Paper>

      <style>
        {`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.3; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}
      </style>

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2, mb: 3 }}>
        <Table sx={{ minWidth: 650 }} size="medium">
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.light' }}>
              <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Section Completed</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Target Section</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Clip</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Quiz</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedEntries.map((item, idx) => {
              const originalIndex = entries.findIndex((entry) => entry.id === item.id);

              return (
                <CoverageRow
                  key={`${item.timestamp_ms}-${idx}`}
                  item={item}
                  quizMatch={quizMatchMap[item.timestamp_ms] || null}
                  originalIndex={originalIndex}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default CoverageTable;