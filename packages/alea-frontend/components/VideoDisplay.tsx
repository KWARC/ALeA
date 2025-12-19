import { InfoOutlined } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ClipDetails,
  ClipInfo,
  ClipMetadata,
  getDefiniedaInSection,
  getDefiniedaInSectionAgg,
} from '@alea/spec';
import { formatTime, getParamFromUri, languageUrlMap, localStore, PathToTour2 } from '@alea/utils';
import axios from 'axios';
import { useRouter } from 'next/router';
import {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import Image from 'next/image';
import Link from 'next/link';
import { setSlideNumAndSectionId } from '../pages/course-view/[courseId]';

function getAvailableRes(info?: ClipDetails) {
  if (!info) return [];
  return Object.keys(info)
    .map((k) => {
      if (k.startsWith('r') && info[k]) return +k.slice(1);
    })
    .filter((v) => !!v)
    .sort((a, b) => a - b);
}

function getVideoId(info: ClipDetails, needRes: number, availableRes: number[]) {
  if (!info || !availableRes?.length) return;
  const res = availableRes.includes(needRes) ? needRes : availableRes[0];
  return info[`r${res}`];
}

interface Marker {
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
export interface SlidesUriToIndexMap {
  [sectionId: string]: {
    [slideUri: string]: number;
  };
}
const MediaItem = ({
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
  videoMode,
  currentSectionId,
  currentSlideUri,
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
  presentationVideoId?: string;
  onVideoTypeChange?: (isPlayingCompositeOrPresentation: boolean) => void;
  videoMode?: 'presenter' | 'presentation' | null;
  currentSectionId?: string;
  currentSlideUri?: string;
}) => {
  const playerRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const videoPlayer = useRef<any>(null);
  const autoSyncEnabled = true;
  const autoSyncRef = useRef(autoSyncEnabled);
  const lastSyncedMarkerTime = useRef<number | null>(null);
  const [tooltip, setTooltip] = useState<string>('');
  const [overlay, setOverlay] = useState<{ title: string; description: string } | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>(videoId);
  const router = useRouter();
  const [conceptsUri, setConceptsUri] = useState<string[]>([]);
  const [loadingConcepts, setLoadingConcepts] = useState(false);
  const conceptsCache = useRef<Record<string, string[]>>({});
  const markersInDescOrder = useMemo(() => {
    return [...markers].sort((a, b) => b.time - a.time);
  }, [markers]);
  useEffect(() => {
    setCurrentVideoUrl(videoId);
  }, [videoId]);

  // Update video URL when videoMode changes
  useEffect(() => {
    if (videoMode === 'presenter' && presenterVideoId) {
      setCurrentVideoUrl(presenterVideoId);
    } else if (videoMode === 'presentation') {
      const targetVideoId = presentationVideoId || compositeVideoId;
      if (targetVideoId) {
        setCurrentVideoUrl(targetVideoId);
      }
    } else if (videoMode === null) {
      // Auto mode: use the default videoId passed as prop
      setCurrentVideoUrl(videoId);
    }
  }, [videoMode, presenterVideoId, presentationVideoId, compositeVideoId, videoId]);

  // Track when composite or presentation video is actively playing
  useEffect(() => {
    const isPlayingCompositeOrPresentation = 
      currentVideoUrl === compositeVideoId || currentVideoUrl === presentationVideoId;
    onVideoTypeChange?.(isPlayingCompositeOrPresentation);
  }, [currentVideoUrl, compositeVideoId, presentationVideoId, onVideoTypeChange]);
  const handleMarkerClick = async (marker: Marker) => {
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
  };
  const handleCurrentMarkerUpdate = ({
    videoPlayer,
    markers,
    handleMarkerClick,
  }: {
    videoPlayer: any;
    markers: Marker[];
    handleMarkerClick: (marker: Marker) => void;
  }) => {
    const currentTime = videoPlayer.current.currentTime();
    const markersInDescOrder = markers.slice().sort((a, b) => b.time - a.time);
    const markerIndex = markersInDescOrder.findIndex((marker) => marker.time <= currentTime);
    if (markerIndex < 0) return;
    const newMarker = markersInDescOrder[markerIndex];
    handleMarkerClick(newMarker);
  };

  useEffect(() => {
    if (audioOnly) {
      if (videoPlayer.current) {
        videoPlayer.current.dispose();
        videoPlayer.current = null;
      }
      return;
    }

    if (!playerRef.current) return;
    let player = videoPlayer.current;

    if (!player) {
      player = videojs(playerRef.current, {
        controls: !audioOnly,
        preload: 'auto',
        autoplay: false,
        sources: [{ src: currentVideoUrl, type: 'video/mp4' }],
      });
      videoPlayer.current = player;
    } else {
      const currentTime = player.currentTime();
      player.src({ src: currentVideoUrl, type: 'video/mp4' });
      player.ready(() => {
        player.currentTime(currentTime);
        player.play();
      });
    }

    const controlBar = playerRef.current.parentNode?.querySelector(
      '.vjs-control-bar'
    ) as HTMLElement;
    if (controlBar) {
      controlBar.style.paddingBottom = '30px';
      controlBar.style.paddingTop = '10px';
      controlBar.style.position = 'absolute';
      controlBar.style.zIndex = '1000';
    }
    const progressBar = playerRef.current.parentNode?.querySelector(
      '.vjs-progress-holder'
    ) as HTMLElement;
    if (progressBar) {
      progressBar.style.marginTop = '20px';
    }
    const bigPlayButton = playerRef.current.parentNode?.querySelector('.vjs-big-play-button');
    const playIcon = bigPlayButton?.querySelector('.vjs-icon-placeholder') as HTMLElement;
    if (playIcon) {
      playIcon.style.bottom = '5px';
      playIcon.style.paddingRight = '25px';
    }
    const textTrackDisplay = playerRef.current.parentNode?.querySelector(
      '.vjs-text-track-display'
    ) as HTMLElement;
    if (textTrackDisplay) {
      Object.assign(textTrackDisplay.style, {
        insetBlock: '0px',
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        margin: '0',
        padding: '0',
      });
    }

    return () => {
      if (audioOnly && player) {
        player.dispose();
        videoPlayer.current = null;
      }
    };
  }, [currentVideoUrl, audioOnly]);
  useEffect(() => {
    const player = videoPlayer.current;
    if (!player) return;

    const onLoadedMetadata = () => {
      const progressHolder = player.controlBar.progressControl.seekBar.el();
      const videoDuration = player.duration();
      const createdMarkers: HTMLElement[] = [];

      markers.forEach((marker) => {
        if (marker.time < videoDuration) {
          const el = document.createElement('div');
          el.className = 'custom-marker';
          el.dataset.label = marker.label;
          el.dataset.time = marker.time.toString();
          el.dataset.sectionId = marker.data.sectionId;
          el.dataset.slideUri = marker.data.slideUri;

          Object.assign(el.style, {
            position: 'absolute',
            top: '0',
            width: '6px',
            height: '100%',
            backgroundColor: 'yellow',
            left: `${(marker.time / videoDuration) * 100}%`,
            zIndex: '10',
            cursor: 'pointer',
          });

          el.addEventListener('mouseenter', () =>
            setTooltip(`${marker.label} - ${formatTime(marker.time)}s`)
          );
          el.addEventListener('mouseleave', () => setTooltip(''));
          el.addEventListener('click', () => handleMarkerClick(marker));

          progressHolder.appendChild(el);
          createdMarkers.push(el);
        }
      });

      if (timestampSec) player.currentTime(timestampSec);
    };

    player.on('loadedmetadata', onLoadedMetadata);
    return () => {
      player.off('loadedmetadata', onLoadedMetadata);
    };
  }, [markers, timestampSec]);
  useEffect(() => {
    const player = videoPlayer.current;
    if (!player) return;

    const onPause = () => handleCurrentMarkerUpdate({ videoPlayer, markers, handleMarkerClick });
    const onSeeked = () => handleCurrentMarkerUpdate({ videoPlayer, markers, handleMarkerClick });

    // player.on('playing', () => setOverlay(null));
    player.on('pause', onPause);
    player.on('seeked', onSeeked);

    return () => {
      player.off('pause', onPause);
      player.off('seeked', onSeeked);
    };
  }, [markers]);
  useEffect(() => {
    const player = videoPlayer.current;
    if (!player) return;

    const onTimeUpdate = () => {
      const currentTime = player.currentTime();
      const availableMarkers = Array.from(
        document.querySelectorAll('.custom-marker')
      ) as HTMLElement[];

      for (const marker of availableMarkers) {
        const markerTime = parseInt(marker.dataset.time, 10);
        marker.style.backgroundColor = currentTime >= markerTime ? 'green' : 'yellow';
      }
      const latestMarker = markersInDescOrder.find((marker) => marker.time <= currentTime);
      if (latestMarker) {
        const sectionId = latestMarker.data?.sectionId;
        const slideUri = latestMarker.data?.slideUri;
        const slideIndex = slidesUriToIndexMap?.[sectionId]?.[slideUri];
        if (autoSyncRef.current && sectionId && slideIndex !== undefined) {
          const shouldUpdate = lastSyncedMarkerTime.current !== latestMarker.time;
          if (shouldUpdate) {
            lastSyncedMarkerTime.current = latestMarker.time;
            setSlideNumAndSectionId(router, (slideIndex ?? -1) + 1, sectionId);
          }
        }
        // Only auto-switch videos if videoMode is null (Auto mode)
        // If user has manually selected presenter or presentation, respect that choice
        if (videoMode === null) {
          if (presenterVideoId && currentVideoUrl !== presenterVideoId) {
            setCurrentVideoUrl(presenterVideoId);
          }
        } else if (videoMode === 'presenter' && presenterVideoId && currentVideoUrl !== presenterVideoId) {
          setCurrentVideoUrl(presenterVideoId);
        } else if (videoMode === 'presentation') {
          const targetVideoId = presentationVideoId || compositeVideoId;
          if (targetVideoId && currentVideoUrl !== targetVideoId) {
            setCurrentVideoUrl(targetVideoId);
          }
        }
      } else {
        // When no marker is found, use fallback logic based on videoMode
        if (videoMode === null) {
          // Auto mode: prefer presentation/composite
          const fallbackVideoId = presentationVideoId || compositeVideoId;
          if (fallbackVideoId && currentVideoUrl !== fallbackVideoId) {
            setCurrentVideoUrl(fallbackVideoId);
          }
        } else if (videoMode === 'presenter' && presenterVideoId && currentVideoUrl !== presenterVideoId) {
          setCurrentVideoUrl(presenterVideoId);
        } else if (videoMode === 'presentation') {
          const targetVideoId = presentationVideoId || compositeVideoId;
          if (targetVideoId && currentVideoUrl !== targetVideoId) {
            setCurrentVideoUrl(targetVideoId);
          }
        }
        lastSyncedMarkerTime.current = null;
      }
    };

    player.on('timeupdate', onTimeUpdate);
    return () => {
      player.off('timeupdate', onTimeUpdate);
    };
  }, [
    markersInDescOrder,
    slidesUriToIndexMap,
    router,
    presenterVideoId,
    compositeVideoId,
    presentationVideoId,
    currentVideoUrl,
    videoMode,
  ]);

  useEffect(() => {
    if (videoPlayer.current && timestampSec !== undefined) {
      videoPlayer.current.currentTime(timestampSec);
    }
  }, [timestampSec]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const progressBar = videoPlayer.current?.controlBar.progressControl.seekBar.el() as HTMLElement;
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
        style={{ width: '100%', background: '#f1f3f4' }}
        ref={playerRef}
      ></audio>
    );
  }
  // const langs = [
  //   { code: 'en', name: 'English' },
  //   { code: 'de', name: 'German' },
  // ];
  return (
    <>
      <Box style={{ marginBottom: '7px', position: 'relative' }}>
        <video
          key="videoPlayer"
          poster={thumbnail}
          ref={playerRef as MutableRefObject<HTMLVideoElement>}
          className="video-js vjs-fluid vjs-styles=defaults vjs-big-play-centered"
          style={{ border: '0.5px solid black', borderRadius: '8px' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {Object.entries(subtitles)
            .filter(([code]) => code !== 'default')
            .map(([code, url]) => {
              if (!url) return null;
              const isDefault = subtitles.default === url;
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
            style={{
              position: 'absolute',
              top: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: '#fff',
              padding: '5px 10px',
              borderRadius: '4px',
              zIndex: '100',
            }}
          >
            {tooltip}
          </Box>
        )}
      </Box>

      {overlay && (
        <Paper
          elevation={4}
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: 'white',
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}
            >
              Concepts in this section
            </Typography>
            <IconButton
              size="small"
              onClick={() => setOverlay(null)}
              sx={{
                backgroundColor: 'rgba(148, 163, 184, 0.4)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(248, 113, 113, 0.9)',
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {loadingConcepts ? (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <CircularProgress color="primary" />
              <Typography variant="body2" color="white" mt={1}>
                Loading concepts...
              </Typography>
            </Box>
          ) : conceptsUri && conceptsUri.length > 0 ? (
            <Box display="flex" flexDirection="column" gap={1}>
              {conceptsUri.map((uri, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(148, 163, 184, 0.5)',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 20px rgba(15,23,42,0.7)',
                      borderColor: 'rgba(96, 165, 250, 0.9)',
                    },
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      whiteSpace: 'normal',
                      wordWrap: 'break-word',
                      pr: 1,
                    }}
                    title={uri}
                  >
                    {getParamFromUri(uri, 's') ?? uri}
                  </Typography>
                  <Link href={PathToTour2(uri)} target="_blank" style={{ textDecoration: 'none' }}>
                    <Tooltip title="Take a guided tour" arrow>
                      <IconButton
                        sx={{
                          backgroundColor: '#ffffff',
                          borderRadius: '50%',
                          padding: '2px',
                          '&:hover': {
                            backgroundColor: '#e5e7eb',
                            transform: 'scale(1.05)',
                            transition: 'transform 0.15s ease-in-out',
                          },
                        }}
                      >
                        <Image
                          src="/guidedTour.png"
                          alt="Tour Logo"
                          width={22}
                          height={22}
                          priority
                        />
                      </IconButton>
                    </Tooltip>
                  </Link>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography
              variant="body2"
              sx={{
                textAlign: 'center',
                fontWeight: 500,
                color: '#e5e7eb',
                mt: 1,
              }}
            >
              No new concepts defined in this section
            </Typography>
          )}
        </Paper>
      )}
    </>
  );
};

function DraggableOverlay({ showOverlay, setShowOverlay, data }) {
  const overlayRef = useRef(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const handleMouseDown = (e) => {
    setDragging(true);
    setOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
  };

  const handleMouseUp = () => setDragging(false);
  const { parentClipId, currentSlideClipInfo } = data;

  return showOverlay ? (
    <Box
      ref={overlayRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        position: 'fixed',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: '300px',
        padding: '10px',
        cursor: 'grab',
        zIndex: 1000,
      }}
    >
      <Paper elevation={3} sx={{ p: 2, position: 'relative', bgcolor: 'rgba(255, 255, 255, 0.9)' }}>
        <IconButton
          onClick={() => setShowOverlay(false)}
          sx={{ position: 'absolute', right: 5, top: 5, zIndex: 1 }}
        >
          <CloseIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          🔍 Video Infos:
        </Typography>
        <Typography variant="body2">Parent Clip Id: {parentClipId}</Typography>
        <Typography variant="body1" sx={{ fontWeight: 'bold', mt: 2 }}>
          Current slide Clip Infos:
        </Typography>
        <Typography variant="body2">Clip ID: {currentSlideClipInfo?.video_id}</Typography>
        <Typography variant="body2">
          Start Time: {formatTime(currentSlideClipInfo?.start_time)}
        </Typography>
        <Typography variant="body2">
          End Time: {formatTime(currentSlideClipInfo?.end_time)}
        </Typography>
      </Paper>
    </Box>
  ) : null;
}

export function VideoDisplay({
  clipId,
  clipIds,
  setCurrentClipId,
  timestampSec,
  setTimestampSec,
  currentSlideClipInfo,
  audioOnly,
  videoExtractedData,
  slidesUriToIndexMap,
  onVideoLoad,
  onVideoTypeChange,
  videoMode,
  currentSectionId,
  currentSlideUri,
}: {
  clipId: string;
  clipIds: { [sectionId: string]: string };
  setCurrentClipId: Dispatch<SetStateAction<string>>;
  timestampSec?: number;
  setTimestampSec?: Dispatch<SetStateAction<number>>;
  currentSlideClipInfo?: ClipInfo;
  audioOnly: boolean;
  videoExtractedData?: {
    [timestampSec: number]: ClipMetadata;
  };
  slidesUriToIndexMap?: SlidesUriToIndexMap;
  onVideoLoad: (status: boolean) => void;
  onVideoTypeChange?: (hasPresentationOrComposite: boolean) => void;
  videoMode?: 'presenter' | 'presentation' | null;
  currentSectionId?: string;
  currentSlideUri?: string;
}) {
  const [resolution, setResolution] = useState(720);
  const [clipDetails, setClipDetails] = useState(undefined as ClipDetails);
  const availableRes = getAvailableRes(clipDetails);
  const presenterVideoId = getVideoId(clipDetails, resolution, availableRes);
  const compositeVideoId = ((clipDetails as Record<string, unknown>)?.compositeUrl ||
    (clipDetails as Record<string, unknown>)?.composite_url) as string | undefined;
  const presentationVideoId = ((clipDetails as Record<string, unknown>)?.presentationUrl ||
    (clipDetails as Record<string, unknown>)?.presentation_url) as string | undefined;
  
  // Determine initial video ID based on videoMode
  // If videoMode is set, use that; otherwise use auto logic (prefer presentation/composite)
  const defaultVideoId = useMemo(() => {
    if (videoMode === 'presenter') {
      return presenterVideoId || compositeVideoId || presentationVideoId;
    } else if (videoMode === 'presentation') {
      return presentationVideoId || compositeVideoId || presenterVideoId;
    } else {
      // Auto mode: prefer presentationVideoId, then compositeVideoId, then presenterVideoId
      return presentationVideoId || compositeVideoId || presenterVideoId;
    }
  }, [videoMode, presenterVideoId, compositeVideoId, presentationVideoId]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);
  const [reveal, setReveal] = useState(false);
  const router = useRouter();
  const markers = Object.entries(videoExtractedData || {})
    .filter(([, item]: [string, Record<string, unknown>]) => {
      return (
        ((item.sectionId as string) || '').trim() !== '' &&
        ((item.slideUri as string) || '').trim() !== ''
      );
    })
    .map(([timestampKey, item]: [string, Record<string, unknown>]) => ({
      time: Math.floor(Number(timestampKey) || ((item.start_time as number) ?? 0)),
      label: (item.sectionTitle as string) || 'Untitled',
      data: {
        thumbnail: (item.thumbnail as string) || null,
        ocr_slide_content: (item.ocr_slide_content as string) || null,
        sectionId: item.sectionId as string,
        sectionUri: item.sectionUri as string,
        slideUri: item.slideUri as string,
      },
    }));

  useEffect(() => {
    if (!clipId) {
      setIsLoading(false);
      setClipDetails(undefined);
      return;
    }
    setIsLoading(true);
    axios.get(`/api/get-fau-clip-info/${clipId}`).then((resp) => {
      setIsLoading(false);
      setClipDetails(resp.data);
    });
  }, [clipId]);

  useEffect(() => {
    setResolution(+(localStore?.getItem('defaultResolution') || '720'));
  }, []);

  // Track when composite or presentation video is actively playing (handled in MediaItem)
  const handleKeyPress = (e) => {
    if (e.key === 'Shift') setReveal(true);
  };

  const handleKeyRelease = (e) => {
    if (e.key === 'Shift') setReveal(false);
  };
  useEffect(() => {
    const isVideoLoaded = !isLoading && !!defaultVideoId;
    onVideoLoad(isVideoLoaded);
  }, [isLoading, defaultVideoId, onVideoLoad]);

  if (isLoading) return <CircularProgress sx={{ mb: '15px' }} />;
  if (!defaultVideoId)
    return (
      <Box sx={{ mb: '25px', position: 'relative' }}>
        <i>Video not available for this section</i>
      </Box>
    );

  return (
    <>
      <Box
        style={{
          width: '100%',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            mb: 1,
          }}
        >
          <Box
            onKeyDown={handleKeyPress}
            onKeyUp={handleKeyRelease}
            tabIndex={0}
            sx={{
              display: 'inline-block',
            }}
          >
            <Button
              onDoubleClick={() => setShowOverlay((prev) => !prev)}
              style={{
                cursor: 'pointer',
                opacity: reveal ? 1 : 0,
                pointerEvents: reveal ? 'auto' : 'none',
              }}
            >
              <InfoOutlined />
            </Button>
          </Box>
          {showOverlay && (
            <DraggableOverlay
              showOverlay={showOverlay}
              setShowOverlay={setShowOverlay}
              data={{ parentClipId: clipId, currentSlideClipInfo: currentSlideClipInfo }}
            />
          )}
        </Box>
        <MediaItem
          videoId={defaultVideoId}
          presenterVideoId={presenterVideoId}
          compositeVideoId={compositeVideoId}
          presentationVideoId={presentationVideoId}
          clipId={clipId}
          clipIds={clipIds}
          timestampSec={timestampSec}
          audioOnly={audioOnly}
          subtitles={clipDetails?.subtitles}
          thumbnail={clipDetails?.thumbnailUrl}
          markers={markers}
          slidesUriToIndexMap={slidesUriToIndexMap}
          onVideoTypeChange={onVideoTypeChange}
          videoMode={videoMode}
          currentSectionId={currentSectionId}
          currentSlideUri={currentSlideUri}
        />
      </Box>
    </>
  );
}
