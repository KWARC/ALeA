import { FTML } from '@flexiformal/ftml';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Box,
  Button,
  IconButton,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { getAllQuizzes, QuizWithStatus } from '@alea/spec';
import { NoMaxWidthTooltip } from '@alea/stex-react-renderer';
import { LectureEntry } from '@alea/utils';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useStudentCount } from '../hooks/useStudentCount';
import { useCurrentTermContext } from '../contexts/CurrentTermContext';
import { SecInfo } from '../types';
import { AutoDetectedTooltipContent } from './AutoDetectedComponent';
import { getSectionNameForUri } from './CoverageUpdater';
import QuizHandler from './QuizHandler';
import { getSectionHierarchy, getSlideTitle } from './SlideSelector';
import {
  calculateLectureProgress,
  countMissingTargetsInFuture,
  getProgressStatusColor,
  isTargetSectionUsed,
} from './CalculateLectureProgress';

interface QuizMatchMap {
  [timestamp_ms: number]: QuizWithStatus | null;
}

interface CoverageRowProps {
  item: LectureEntry;
  quizMatch: QuizWithStatus | null;
  originalIndex: number;
  onEdit: (index: number, prefill?: Partial<LectureEntry>) => void;
  onDelete: (index: number) => void;
  secInfo: Record<FTML.DocumentUri, SecInfo>;
  entries: LectureEntry[];
}

const formatSectionWithSlide = (sectionName: string, slideNumber?: number, slideUri?: string) => {
  if (!sectionName) return <i>-</i>;
  if (!slideUri) return <Typography variant="body2">{sectionName.trim()}</Typography>;

  const slideTitle = getSlideTitle({ slide: { uri: slideUri } } as any, (slideNumber || 1) - 1);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <SlideshowIcon sx={{ fontSize: 16, color: 'success.main' }} />
      <Typography variant="body2">
        <strong>{slideTitle}</strong> of {sectionName.trim()}
      </Typography>
    </Box>
  );
};

const tooltipBoxProps = {
  maxWidth: '600px',
  color: '#1a237e',
  border: '2px solid #3f51b5',
  p: '12px',
  borderRadius: '8px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  bgcolor: 'white',
};

function SectionTooltipContent({
  shouldHighlightNoSection,
  secInfo,
  sectionUri,
  sectionCompleted,
}: {
  shouldHighlightNoSection: boolean;
  secInfo: Record<FTML.DocumentUri, SecInfo>;
  sectionUri: string;
  sectionCompleted?: boolean;
}) {
  const sectionId = secInfo[sectionUri]?.id;
  if (!sectionId) return shouldHighlightNoSection ? 'No Section - Please fill this field' : null;

  const statusString =
    sectionCompleted !== undefined
      ? sectionCompleted
        ? ' (✅ Completed)'
        : ' (⏳ In Progress)'
      : '';
  return (
    <Box {...tooltipBoxProps}>
      <span style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
        {getSectionHierarchy(sectionId, secInfo) + statusString}
      </span>
    </Box>
  );
}

function CoverageRow({
  item,
  quizMatch,
  originalIndex,
  onEdit,
  onDelete,
  secInfo,
  entries,
}: CoverageRowProps) {
  const now = dayjs();
  const itemDate = dayjs(item.timestamp_ms);
  const endTime = dayjs(item.lectureEndTimestamp_ms);
  const isPast = itemDate.isBefore(now, 'day');
  const isFuture = itemDate.isAfter(now, 'day');
  const isToday = itemDate.isSame(now, 'day');
  const isNoSection = !item.sectionUri;
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

  const sectionTitle = secInfo[item.sectionUri]?.title;
  const targetSectionTitle = secInfo[item.targetSectionUri]?.title;

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
        <NoMaxWidthTooltip
          title={
            <Box {...tooltipBoxProps}>
              <Box sx={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                <Typography fontWeight="bold" display="inline">
                  Lecture Timings:
                </Typography>
                <Typography display="inline">
                  {`${itemDate.format('HH:mm')} - ${endTime.format('HH:mm')}`}
                </Typography>
              </Box>
              {item.venue && (
                <>
                  <Typography fontWeight="bold" mt={1} display="inline">
                    Venue:
                  </Typography>
                  {item.venueLink ? (
                    <Link
                      component="a"
                      href={item.venueLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        color: 'blue.sky',
                        textDecoration: 'underline',
                        fontWeight: 'bold',
                        fontSize: '0.85rem',
                      }}
                    >
                      {item.venue}
                    </Link>
                  ) : (
                    <Typography display="inline">{item.venue}</Typography>
                  )}
                </>
              )}
            </Box>
          }
          arrow
        >
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
        </NoMaxWidthTooltip>
      </TableCell>
      <TableCell
        sx={{
          maxWidth: '250px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <NoMaxWidthTooltip
          title={
            <SectionTooltipContent
              shouldHighlightNoSection={shouldHighlightNoSection}
              secInfo={secInfo}
              sectionUri={item.sectionUri}
              sectionCompleted={!!item.sectionCompleted}
            />
          }
        >
          <span>
            {shouldHighlightNoSection ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    opacity: 0.8,
                  },
                }}
                onClick={() => onEdit(originalIndex, item.autoDetected)}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: 'error.main',
                    fontStyle: 'italic',
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                  }}
                >
                  Update pending
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: 'error.main', animation: 'blink 1.5s infinite' }}
                >
                  ⚠️
                </Typography>
              </Box>
            ) : (
              formatSectionWithSlide(sectionTitle, item.slideNumber, item.slideUri)
            )}
          </span>
        </NoMaxWidthTooltip>
      </TableCell>
      <TableCell
        sx={{
          maxWidth: '200px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <NoMaxWidthTooltip
          title={
            <SectionTooltipContent
              shouldHighlightNoSection={shouldHighlightNoSection}
              secInfo={secInfo}
              sectionUri={item.targetSectionUri}
            />
          }
        >
          <Typography variant="body2">
            {targetSectionTitle?.trim() || item.targetSectionUri || <i>-</i>}
          </Typography>
        </NoMaxWidthTooltip>
      </TableCell>
      <TableCell>
        {item.clipId?.length ? (
          <Button
            variant="outlined"
            size="small"
            href={`https://fau.tv/clip/id/${item.clipId}`}
            target="_blank"
            rel="noreferrer"
            endIcon={<OpenInNewIcon fontSize="small" />}
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
            onClick={() => {
              const useAutoDetected = !item.sectionUri;
              onEdit(originalIndex, useAutoDetected ? item.autoDetected : undefined);
            }}
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
          <NoMaxWidthTooltip
            title={
              <Box
                maxWidth="600px"
                color="#1a237e"
                border="1px solid #CCC"
                p="10px"
                borderRadius="5px"
                boxShadow="2px 7px 31px 8px rgba(0, 0, 0, 0.33)"
              >
                <Box sx={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                  <Typography fontWeight="bold" mb={1}>
                    Auto-detected Data
                  </Typography>
                  <AutoDetectedTooltipContent
                    autoDetected={item.autoDetected}
                    getSectionName={(uri) => getSectionNameForUri(uri, secInfo)}
                  />
                </Box>
              </Box>
            }
          >
            <IconButton
              size="small"
              color="info"
              sx={{
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                },
                transition: 'all 0.2s',
              }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </NoMaxWidthTooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}


const getProgressIcon = (status: string) => {
  if (status.includes('ahead')) return '🚀';
  if (status.includes('behind')) return '⚠️';
  if (status.includes('on track')) return '✅';
  return '📊';
};

interface CoverageTableProps {
  courseId: string;
  entries: LectureEntry[];
  secInfo: Record<FTML.DocumentUri, SecInfo>;
  onEdit: (index: number, prefill?: Partial<LectureEntry>) => void;
  onDelete: (index: number) => void;
}
export function CoverageTable({
  courseId,
  entries,
  secInfo,
  onEdit,
  onDelete,
}: CoverageTableProps) {
  const targetUsed = isTargetSectionUsed(entries);
  const status = calculateLectureProgress(entries, secInfo);
  const missingTargetsCount = countMissingTargetsInFuture(entries);
  const sortedEntries = [...entries].sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  const [quizMatchMap, setQuizMatchMap] = useState<QuizMatchMap>({});
  const { currentTermByCourseId } = useCurrentTermContext();
  const currentTerm = currentTermByCourseId[courseId];
  const studentCount = useStudentCount(courseId, currentTerm);

  useEffect(() => {
    async function fetchQuizzes() {
      if (!currentTerm) return;
      try {
        const allQuizzes = await getAllQuizzes(courseId, currentTerm);
        const map: QuizMatchMap = {};
        entries.forEach((entry) => {
          const match = allQuizzes.find(
            (quiz) => Math.abs(quiz.quizStartTs - entry.timestamp_ms) < 6 * 60 * 60 * 1000
          );
          map[entry.timestamp_ms] = match || null;
        });
        setQuizMatchMap(map);
      } catch (err) {
        console.error('Error fetching quizzes:', err);
      }
    }
    fetchQuizzes();
  }, [courseId, currentTerm, entries]);

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {studentCount !== null && (
          <Typography variant="body1" color="text.secondary">
            Total Students Enrolled: {studentCount}
          </Typography>
        )}
      </Box>
      {targetUsed && (
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
            background:
              'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(25, 118, 210, 0.1) 100%)',
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
            },
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
                  mb: 0.5,
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
                  letterSpacing: '0.5px',
                }}
              >
                {status}
              </Typography>
              {missingTargetsCount > 0 && (
                <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 500 }}>
                  ⚠️ {missingTargetsCount} lecture{missingTargetsCount !== 1 ? 's' : ''} missing
                  agenda
                </Typography>
              )}
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
                fontSize: '1.5rem',
              }}
            >
              📚
            </Box>
          </Box>
        </Paper>
      )}
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
              const originalIndex = entries.findIndex(
                (entry) => entry.timestamp_ms === item.timestamp_ms
              );

              return (
                <CoverageRow
                  key={`${item.timestamp_ms}-${idx}`}
                  item={item}
                  quizMatch={quizMatchMap[item.timestamp_ms] || null}
                  originalIndex={originalIndex}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  secInfo={secInfo}
                  entries={entries}
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
