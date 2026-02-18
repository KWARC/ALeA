import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ErrorIcon from '@mui/icons-material/Error';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReplayIcon from '@mui/icons-material/Replay';
import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import { ClipDetails } from '@alea/spec';

export interface UnmatchedSegment {
  timestamp: string;
  ocr_text: string;
  start_time: number;
  end_time: number;
}

interface UnmatchedSegmentsProps {
  segments: UnmatchedSegment[];
  clipId: string;
  onSegmentSelect?: (segment: UnmatchedSegment) => void;
  onPlaySegment?: (segment: UnmatchedSegment) => void;
}

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  isEnded: boolean;
  volume: number;
}

const initialPlaybackState: PlaybackState = {
  isPlaying: false,
  currentTime: 0,
  isEnded: false,
  volume: 1,
};

const VOLUME_STEP = 0.1;

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function getSegmentDuration(startTime: number, endTime: number): string {
  const duration = endTime - startTime;
  return `${Math.round(duration)}s`;
}

export function UnmatchedSegments({ segments, clipId, onSegmentSelect }: UnmatchedSegmentsProps) {
  const [selectedSegment, setSelectedSegment] = useState<UnmatchedSegment | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [playback, setPlayback] = useState<PlaybackState>(initialPlaybackState);
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    data: videoInfo = null,
    isFetching: isLoadingVideo,
    error: videoQueryError,
  } = useQuery<ClipDetails>({
    queryKey: ['clipInfo', clipId],
    queryFn: async () => {
      const response = await axios.get(`/api/get-fau-clip-info/${clipId}`);
      return response.data;
    },
    enabled: openDialog && !!clipId,
    staleTime: Infinity,
  });

  const videoError = videoQueryError ? 'Failed to load video. Please try again.' : null;
  const videoSource: string | null = (() => {
    if (!videoInfo) return null;
    const base = videoInfo.compositeUrl || null;
    if (!base || !selectedSegment) return base;
    return `${base}#t=${selectedSegment.start_time},${selectedSegment.end_time}`;
  })();
  const stats = useMemo(() => {
    const totalDuration = segments.reduce((sum, seg) => sum + (seg.end_time - seg.start_time), 0);
    return {
      totalDuration: formatTime(totalDuration),
      percentage:
        segments.length > 0 ? Math.round((segments.length / (segments.length + 1)) * 100) : 0,
    };
  }, [segments]);

  useEffect(() => {
    if (videoRef.current && selectedSegment && videoInfo) {
      videoRef.current.currentTime = selectedSegment.start_time;
      setPlayback((prev) => ({
        ...prev,
        isPlaying: false,
        currentTime: selectedSegment.start_time,
        isEnded: false,
      }));
    }
  }, [videoInfo, selectedSegment]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedSegment) return;

    const handleTimeUpdate = () => {
      if (video.currentTime >= selectedSegment.end_time) {
        video.pause();
        video.currentTime = selectedSegment.start_time;
        setPlayback((prev) => ({
          ...prev,
          isPlaying: false,
          currentTime: selectedSegment.start_time,
          isEnded: true,
        }));
      } else {
        setPlayback((prev) => ({ ...prev, currentTime: video.currentTime }));
      }
    };

    const handlePlay = () => setPlayback((prev) => ({ ...prev, isPlaying: true, isEnded: false }));
    const handlePause = () => setPlayback((prev) => ({ ...prev, isPlaying: false }));

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [selectedSegment, videoInfo]);

  const handleSegmentClick = (segment: UnmatchedSegment) => {
    setSelectedSegment(segment);
    setOpenDialog(true);
    onSegmentSelect?.(segment);
  };

  const handleCloseDialog = () => {
    videoRef.current?.pause();
    setOpenDialog(false);
    setSelectedSegment(null);
    setPlayback(initialPlaybackState);
  };

  const handleTogglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !selectedSegment) return;
    if (playback.isEnded || video.currentTime >= selectedSegment.end_time) {
      video.currentTime = selectedSegment.start_time;
      setPlayback((prev) => ({ ...prev, isEnded: false }));
    }
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, [playback.isEnded, selectedSegment]);

  const handleReplay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !selectedSegment) return;
    video.currentTime = selectedSegment.start_time;
    setPlayback((prev) => ({ ...prev, isEnded: false }));
    video.play();
  }, [selectedSegment]);

  const handleSliderChange = useCallback(
    (_: Event, value: number | number[]) => {
      const video = videoRef.current;
      if (!video || !selectedSegment) return;
      const newTime = selectedSegment.start_time + (value as number);
      video.currentTime = newTime;
      setPlayback((prev) => ({ ...prev, currentTime: newTime, isEnded: false }));
    },
    [selectedSegment]
  );

  const handleVolumeUp = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = Math.min(1, Math.round((playback.volume + VOLUME_STEP) * 10) / 10);
    video.volume = newVolume;
    setPlayback((prev) => ({ ...prev, volume: newVolume }));
  }, [playback.volume]);

  const handleVolumeDown = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = Math.max(0, Math.round((playback.volume - VOLUME_STEP) * 10) / 10);
    video.volume = newVolume;
    setPlayback((prev) => ({ ...prev, volume: newVolume }));
  }, [playback.volume]);

  if (!segments || segments.length === 0) {
    return (
      <Box sx={unmatchedSegmentsStyles.emptyState}>
        <Typography variant="body2" color="success.700">
          ✓ All video segments are matched with slides!
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={unmatchedSegmentsStyles.statsHeader}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" color="warning.dark">
              Unmatched Segments
            </Typography>
            <Typography variant="caption" color="warning.dark">
              {segments.length} segment{segments.length !== 1 ? 's' : ''} • Total duration:{' '}
              {stats.totalDuration}
            </Typography>
          </Box>
          <Chip
            label={`${stats.percentage}% unmatched`}
            color="warning"
            variant="outlined"
            size="small"
          />
        </Stack>
        <LinearProgress
          variant="determinate"
          value={100 - stats.percentage}
          sx={unmatchedSegmentsStyles.progressBar}
        />
      </Box>
      <Stack spacing={1.5}>
        {segments.map((segment, index) => (
          <Card
            key={`${segment.start_time}-${index}`}
            sx={unmatchedSegmentsStyles.segmentCard}
            onClick={() => handleSegmentClick(segment)}
          >
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack spacing={1}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="flex-start"
                  justifyContent="space-between"
                >
                  <Box flex={1}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mb: 0.5 }}
                    >
                      {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                    </Typography>
                    <Typography variant="body2" sx={unmatchedSegmentsStyles.ocrText}>
                      {segment.ocr_text}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PlayArrowIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSegmentClick(segment);
                    }}
                  >
                    View
                  </Button>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={getSegmentDuration(segment.start_time, segment.end_time)}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={segmentDialogStyles.titleRow}>
            <Typography variant="h6">Unmatched Segment</Typography>
            {selectedSegment && (
              <Typography variant="caption" color="text.secondary">
                {formatTime(selectedSegment.start_time)} - {formatTime(selectedSegment.end_time)}
              </Typography>
            )}
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {isLoadingVideo ? (
            <Box sx={segmentDialogStyles.loadingContainer}>
              <CircularProgress />
            </Box>
          ) : videoError ? (
            <Alert severity="error" icon={<ErrorIcon />}>
              {videoError}
            </Alert>
          ) : !videoSource ? (
            <Alert severity="warning" icon={<ErrorIcon />}>
              Composite video not available for this segment.
            </Alert>
          ) : selectedSegment ? (
            <Stack spacing={2}>
              <Box sx={segmentDialogStyles.videoContainer}>
                <Box
                  component="video"
                  ref={videoRef}
                  sx={segmentDialogStyles.videoElement}
                  onLoadedMetadata={() => {
                    if (videoRef.current && selectedSegment) {
                      videoRef.current.currentTime = selectedSegment.start_time;
                      setPlayback((prev) => ({
                        ...prev,
                        currentTime: selectedSegment.start_time,
                      }));
                    }
                  }}
                >
                  <source src={videoSource} type="video/mp4" />
                  Your browser does not support the video tag.
                </Box>
                <Box sx={segmentDialogStyles.controlsBar}>
                  <Slider
                    size="small"
                    min={0}
                    max={selectedSegment.end_time - selectedSegment.start_time}
                    step={0.1}
                    value={Math.max(0, playback.currentTime - selectedSegment.start_time)}
                    onChange={handleSliderChange}
                    sx={segmentDialogStyles.slider}
                  />
                  <Box sx={segmentDialogStyles.controlsRow}>
                    <IconButton
                      size="small"
                      onClick={playback.isEnded ? handleReplay : handleTogglePlay}
                      sx={segmentDialogStyles.controlButton}
                    >
                      {playback.isEnded ? (
                        <ReplayIcon fontSize="small" />
                      ) : playback.isPlaying ? (
                        <PauseIcon fontSize="small" />
                      ) : (
                        <PlayArrowIcon fontSize="small" />
                      )}
                    </IconButton>
                    <Typography variant="caption" sx={segmentDialogStyles.timeDisplay}>
                      {`${formatTime(playback.currentTime)} / ${formatTime(
                        selectedSegment.end_time
                      )}`}
                    </Typography>

                    <Box flex={1} />
                    <Box sx={segmentDialogStyles.volumeGroup}>
                      <IconButton
                        size="small"
                        onClick={handleVolumeDown}
                        disabled={playback.volume <= 0}
                        sx={segmentDialogStyles.controlButton}
                        aria-label="Volume down"
                      >
                        <VolumeDownIcon fontSize="small" />
                      </IconButton>

                      <Typography variant="caption" sx={segmentDialogStyles.volumeLabel}>
                        {Math.round(playback.volume * 100)}%
                      </Typography>

                      <IconButton
                        size="small"
                        onClick={handleVolumeUp}
                        disabled={playback.volume >= 1}
                        sx={segmentDialogStyles.controlButton}
                        aria-label="Volume up"
                      >
                        <VolumeUpIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    <Typography variant="caption" sx={segmentDialogStyles.segmentLabel}>
                      Segment only
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Box sx={segmentDialogStyles.detailsBox}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Segment Details
                </Typography>
                <Stack spacing={1}>
                  <Box sx={segmentDialogStyles.detailRow}>
                    <Typography variant="caption" color="text.secondary">
                      Duration:
                    </Typography>
                    <Typography variant="caption" fontWeight={600}>
                      {getSegmentDuration(selectedSegment.start_time, selectedSegment.end_time)}
                    </Typography>
                  </Box>
                  <Box sx={segmentDialogStyles.detailRow}>
                    <Typography variant="caption" color="text.secondary">
                      Start Time:
                    </Typography>
                    <Typography variant="caption" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                      {formatTime(selectedSegment.start_time)}
                    </Typography>
                  </Box>
                  <Box sx={segmentDialogStyles.detailRow}>
                    <Typography variant="caption" color="text.secondary">
                      End Time:
                    </Typography>
                    <Typography variant="caption" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                      {formatTime(selectedSegment.end_time)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  OCR Text
                </Typography>
                <Typography variant="body2" sx={segmentDialogStyles.ocrBox}>
                  {selectedSegment.ocr_text}
                </Typography>
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

const unmatchedSegmentsStyles = {
  emptyState: {
    p: 2,
    bgcolor: 'success.50',
    borderRadius: 1,
  },
  statsHeader: {
    mb: 2,
    p: 2,
    bgcolor: 'warning.100',
    borderRadius: 1,
    border: '1px solid',
    borderColor: 'warning.main',
  },
  progressBar: {
    mt: 1.5,
    height: 6,
    borderRadius: 1,
  },
  segmentCard: {
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      boxShadow: (theme: any) => theme.shadows[3],
      transform: 'translateY(-2px)',
      bgcolor: 'grey.50',
    },
  },
  ocrText: {
    color: 'text.primary',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    lineHeight: 1.4,
  },
};

const segmentDialogStyles = {
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 300,
  },
  videoContainer: {
    width: '100%',
    bgcolor: 'grey.900',
    borderRadius: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  videoElement: {
    display: 'block',
    width: '100%',
    aspectRatio: '16/9',
    objectFit: 'contain',
  },
  controlsBar: {
    px: 1.5,
    py: 1,
    bgcolor: 'grey.800',
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5,
  },
  slider: {
    color: 'primary.main',
    py: 0.5,
    '& .MuiSlider-thumb': { width: 12, height: 12 },
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },
  controlButton: {
    color: 'primary.contrastText',
    p: 0.5,
    '&.Mui-disabled': {
      color: 'text.disabled',
    },
  },
  timeDisplay: {
    color: 'primary.contrastText',
    fontFamily: 'monospace',
  },
  volumeGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
  },
  volumeLabel: {
    color: 'primary.contrastText',
    fontFamily: 'monospace',
    minWidth: 30,
    textAlign: 'center' as const,
  },
  segmentLabel: {
    color: 'text.disabled',
  },
  detailsBox: {
    bgcolor: 'background.paper',
    p: 2,
    borderRadius: 1,
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  ocrBox: {
    p: 1.5,
    bgcolor: 'background.paper',
    borderRadius: 1,
    whiteSpace: 'pre-wrap',
  },
};
