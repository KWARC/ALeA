import { languageUrlMap } from '@alea/utils';
import { ClipInfo, getDefiniedaInSectionAgg, Slide } from '@alea/spec';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useRouter } from 'next/router';
import { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'video.js/dist/video-js.css';
import { SlidesUriToIndexMap } from './VideoDisplay';
import {
  getVideoContainerStyles,
  getVideoStyles,
  getVideoContainerWrapperStyles,
  shouldMakeControlBarFullWidth as shouldMakeFullWidth,
  isPresentationVideoShowing as checkIsPresentationVideoShowing,
} from './video-controller-styles/VideoControllerStyles';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { usePresentationVideoPlayer } from '../hooks/usePresentationVideoPlayer';
import { useVideoMarkers } from '../hooks/useVideoMarkers';
import { applyVideoPlayerStyles } from '../utils/videoPlayerStyles';
import {
  calculateCurrentSlideClipRange,
  calculateSelectedSectionFirstSlideTime,
} from '../utils/slideTimeCalculations';
import { ConceptsOverlay } from './ConceptsOverlay';
import { AwayFromSlideWarning } from './AwayFromSlideWarning';
import { SafeHtml } from '@alea/react-utils';
import { PresentationToggleButton } from './PresentationToggleButton';
import { SlidesClipInfo } from '../types/slideClipInfo';

export interface Marker {
  time: number;
  label: string;
  data: {
    title?: string;
    description?: string;
    thumbnail?: string;
    sectionId?: string;
    sectionUri?: string;
    slideUri?: string;
    ocr_slide_content?: string;
  };
}

export function MediaItem({
  audioOnly,
  videoId,
  subtitles,
  thumbnail,
  timestampSec,
  markers,
  clipId,
  clipIds,
  slidesUriToIndexMap,
  presenterVideoId,
  compositeVideoId,
  presentationVideoId,
  onVideoTypeChange,
  currentSectionId,
  currentSlideUri,
  courseId,
  slidesClipInfo,
  videoLoaded,
  showPresentationVideo,
  hasSlidesForSection,
  onHasSlideAtCurrentTimeChange,
  sectionTitle,
  onPresentationVideoToggle,
  isChangingResolution,
}: {
  audioOnly: boolean;
  videoId: string;
  clipId: string;
  clipIds: { [sectionId: string]: string };
  subtitles?: Record<string, string>;
  thumbnail?: string;
  timestampSec?: number;
  markers?: Marker[];
  slidesUriToIndexMap?: SlidesUriToIndexMap;
  presenterVideoId?: string;
  compositeVideoId?: string;
  showPresentationVideo?: boolean;
  presentationVideoId?: string;
  onVideoTypeChange?: (isPlayingCompositeOrPresentation: boolean) => void;
  currentSectionId?: string;
  currentSlideUri?: string;
  courseId?: string;
  slidesClipInfo?: SlidesClipInfo;
  videoLoaded?: boolean;
  hasSlidesForSection?: boolean;
  onHasSlideAtCurrentTimeChange?: (hasSlide: boolean) => void;
  sectionTitle?: string;
  onPresentationVideoToggle?: () => void;
  isChangingResolution?: boolean;
}) {
  const playerRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const presentationPlayerRef = useRef<HTMLVideoElement | null>(null);
  const [tooltip, setTooltip] = useState<string>('');
  const [overlay, setOverlay] = useState<{ title: string; description: string } | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>(videoId);
  const router = useRouter();
  const [conceptsUri, setConceptsUri] = useState<string[]>([]);
  const [loadingConcepts, setLoadingConcepts] = useState(false);
  const conceptsCache = useRef<Record<string, string[]>>({});
  const [isAwayFromSlide, setIsAwayFromSlide] = useState(false);
  const [showConcepts, setShowConcepts] = useState(true);
  const [hasSlideAtCurrentTime, setHasSlideAtCurrentTime] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('alea_show_concepts_overlay');
    if (stored !== null) {
      setShowConcepts(stored === 'true');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('alea_show_concepts_overlay', String(showConcepts));
  }, [showConcepts]);

  const hasSlides = !!hasSlidesForSection; 
  const masterVideoUrl = presenterVideoId || videoId;

  const currentSlideClipRange = useMemo(
    () => calculateCurrentSlideClipRange(currentSlideUri, currentSectionId, slidesClipInfo, clipId),
    [currentSlideUri, currentSectionId, slidesClipInfo, clipId]
  );

  const selectedSectionFirstSlideTime = useMemo(
    () =>
      calculateSelectedSectionFirstSlideTime(
        currentSectionId,
        slidesClipInfo,
        slidesUriToIndexMap,
        clipId
      ),
    [currentSectionId, slidesClipInfo, slidesUriToIndexMap, clipId]
  );

  useEffect(() => {
    const player = videoPlayer.current;
    if (!player) return;

    const onTimeUpdate = () => {
      const t = player.currentTime();
      if (currentSlideClipRange) {
        setIsAwayFromSlide(t < currentSlideClipRange.start || t > currentSlideClipRange.end);
      } else if (selectedSectionFirstSlideTime !== null && videoLoaded) {
        const threshold = 2;
        const isAtFirstSlide = Math.abs(t - selectedSectionFirstSlideTime) <= threshold;
        setIsAwayFromSlide(!isAtFirstSlide);
      } else {
        setIsAwayFromSlide(false);
      }
    };

    player.on('timeupdate', onTimeUpdate);
    return () => {
      player.off('timeupdate', onTimeUpdate);
    };
  }, [currentSlideClipRange, selectedSectionFirstSlideTime, videoLoaded]);

  useEffect(() => {
    if (presenterVideoId) {
      setCurrentVideoUrl(presenterVideoId);
    } else {
      setCurrentVideoUrl(videoId);
    }
  }, [presenterVideoId, videoId]);
  useEffect(() => {
    const isPlayingCompositeOrPresentation =
      currentVideoUrl === compositeVideoId || currentVideoUrl === presentationVideoId;
    onVideoTypeChange?.(isPlayingCompositeOrPresentation);
  }, [currentVideoUrl, compositeVideoId, presentationVideoId, onVideoTypeChange]);
  const handleMarkerClick = useCallback(async (marker: Marker) => {
    const sectionUri = marker?.data?.sectionUri;
    if (!sectionUri) return;
    if (conceptsCache.current[sectionUri]) {
      setConceptsUri(conceptsCache.current[sectionUri]);
      setOverlay({
        title: marker.label ?? 'Untitled',
        description: marker.data.description ?? 'No Description Available',
      });
      return;
    }
    setLoadingConcepts(true);
    try {
      const definedConcepts = await getDefiniedaInSectionAgg(sectionUri);
      const result = definedConcepts.map((concept) => concept.conceptUri) ?? [];
      conceptsCache.current[sectionUri] = result;

      setConceptsUri(result);
    } catch (err) {
      console.error('Error loading concepts:', err);
      setConceptsUri([]);
    } finally {
      setLoadingConcepts(false);
    }
    setOverlay({
      title: marker.label ?? 'Untitled',
      description: marker.data.description ?? 'No Description Available',
    });
  }, []);

  const videoPlayer = useVideoPlayer({
    playerRef,
    masterVideoUrl,
    audioOnly,
    timestampSec,
    applyVideoPlayerStyles,
  });

  const presentationVideoUrl = presentationVideoId || compositeVideoId;
  usePresentationVideoPlayer({
    presentationPlayerRef,
    presentationVideoUrl,
    hasSlides,
    hasSlideAtCurrentTime,
    showPresentationVideo,
    audioOnly,
    masterVideoPlayer: videoPlayer,
  });

  useVideoMarkers({
    videoPlayer,
    markers,
    timestampSec,
    setTooltip,
    handleMarkerClick,
    slidesUriToIndexMap,
    router,
    hasSlideAtCurrentTime,
    setHasSlideAtCurrentTime,
    onHasSlideAtCurrentTimeChange,
    autoSyncEnabled: !isChangingResolution
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    const progressBar = videoPlayer.current?.controlBar.progressControl.seekBar.el() as HTMLElement;
    if (!progressBar) return;
    const rect = progressBar.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const timeAtCursor = (mouseX / rect.width) * videoPlayer.current?.duration();
    const closestMarker = markers.find(
      (marker) => timeAtCursor !== undefined && Math.abs(marker.time - timeAtCursor) < 1
    );

    if (closestMarker) {
      setTooltip(`${closestMarker.label} - ${closestMarker.time}s`);
    }
  };

  const handleMouseLeave = () => setTooltip('');

  if (audioOnly) {
    return (
      <audio
        autoPlay={true}
        src={videoId}
        preload="auto"
        controls
        onLoadedMetadata={() => {
          if (timestampSec) playerRef.current.currentTime = timestampSec;
        }}
        style={{ width: '100%', backgroundColor: '#f1f3f4' }}
        ref={playerRef}
      ></audio>
    );
  }
  const hasPresenterVideo = !!presenterVideoId;
  const isPresentationVideoShowing = checkIsPresentationVideoShowing(
    presentationVideoUrl,
    hasSlides,
    hasSlideAtCurrentTime,
    showPresentationVideo,
    audioOnly
  );
  const shouldMakeControlBarFullWidth = shouldMakeFullWidth(
    hasPresenterVideo,
    isPresentationVideoShowing
  );

  const videoContainerStyles = getVideoContainerStyles();
  const videoStyles = getVideoStyles();
  const videoContainerWrapperStyles = getVideoContainerWrapperStyles({
    hasPresenterVideo,
    isPresentationVideoShowing,
    shouldMakeControlBarFullWidth,
  });

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <Box sx={videoContainerWrapperStyles}>
        <Box sx={videoContainerStyles}>
          <video
            key="videoPlayer"
            poster={thumbnail}
            ref={playerRef as MutableRefObject<HTMLVideoElement>}
            className="video-js vjs-fluid vjs-styles=defaults vjs-big-play-centered"
            style={videoStyles}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {Object.entries(subtitles || {})
              .filter(([code]) => code !== 'default')
              .map(([code, url]) => {
                if (!url) return null;
                const isDefault = subtitles?.default === url;
                const label = `${languageUrlMap[code] || code}${isDefault ? ' ★' : ''}`;
                return (
                  <track
                    key={code}
                    src={url}
                    label={label}
                    kind="captions"
                    srcLang={code}
                    default={isDefault}
                  />
                );
              })}
          </video>

          {tooltip && (
            <Box
              sx={{
                position: 'absolute',
                top: { xs: 1, md: 1.25 },
                left: '50%',
                transform: 'translateX(-50%)',
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                px: { xs: 1, md: 1.25 },
                py: 0.5,
                borderRadius: 0.5,
                zIndex: 100,
                fontSize: { xs: '0.75rem', md: '0.875rem' },
              }}
            >
              {tooltip}
            </Box>
          )}
          <AwayFromSlideWarning
            isAwayFromSlide={isAwayFromSlide}
            currentSlideClipRange={currentSlideClipRange}
            selectedSectionFirstSlideTime={selectedSectionFirstSlideTime}
            onJumpToSlide={() => {
              const targetTime = currentSlideClipRange
                ? currentSlideClipRange.start
                : selectedSectionFirstSlideTime;
              if (targetTime !== null && targetTime !== undefined) {
                videoPlayer.current?.currentTime(targetTime);
              }
            }}
          />
        </Box>
        {presentationVideoUrl &&
          (!hasSlides || !hasSlideAtCurrentTime || showPresentationVideo) && (
            <Box sx={videoContainerStyles}>
              <video
                ref={presentationPlayerRef as MutableRefObject<HTMLVideoElement>}
                className="video-js vjs-fluid vjs-styles=defaults"
                style={videoStyles}
                muted
              />
              <PresentationToggleButton
                showPresentationVideo={showPresentationVideo}
                hasSlideAtCurrentTime={hasSlideAtCurrentTime}
                onToggle={onPresentationVideoToggle}
              />
            </Box>
          )}
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: shouldMakeControlBarFullWidth ? 0 : 6,
          px: 1,
          position: 'relative',
          zIndex: 1001,
        }}
      >
        {!showConcepts && (
          <>
            {sectionTitle && (
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: '#111827',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '70%',
                }}
              >
                <SafeHtml html={sectionTitle} />
              </Typography>
            )}
            <Tooltip title="Show concepts" arrow>
              <IconButton
                size="small"
                onClick={() => setShowConcepts(true)}
                sx={{
                  bgcolor: '#e5e7eb',
                  color: '#111827',
                  border: '1px solid rgba(148, 163, 184, 0.7)',
                  '&:hover': { bgcolor: '#d1d5db' },
                }}
              >
                <MenuBookIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      <ConceptsOverlay
        showConcepts={showConcepts}
        loadingConcepts={loadingConcepts}
        conceptsUri={conceptsUri}
        overlay={overlay}
        onClose={() => setShowConcepts(false)}
        sectionTitle={sectionTitle}
      />
    </Box>
  );
}
