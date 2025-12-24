import { formatTime, getParamFromUri, languageUrlMap, PathToTour2 } from '@alea/utils';
import { ClipInfo, getDefiniedaInSectionAgg, Slide } from '@alea/spec';
import { Box, CircularProgress, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useRouter } from 'next/router';
import { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import Image from 'next/image';
import Link from 'next/link';
import { setSlideNumAndSectionId } from '../pages/course-view/[courseId]';
import { SlidesUriToIndexMap } from './VideoDisplay';

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
  videoMode,
  currentSectionId,
  currentSlideUri,
  courseId,
  slidesClipInfo,
  slideNum,
  onSlideChange,
  goToNextSection,
  goToPrevSection,
  onClipChange,
  videoLoaded,
  showPresentationVideo,
  hasSlidesForSection,
  onHasSlideAtCurrentTimeChange,
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
  videoMode?: 'presenter' | 'presentation' | null;
  currentSectionId?: string;
  currentSlideUri?: string;
  courseId?: string;
  slidesClipInfo?: {
    [sectionId: string]: {
      [slideUri: string]: ClipInfo[];
    };
  };
  slideNum?: number;
  onSlideChange?: (slide: Slide) => void;
  goToNextSection?: () => void;
  goToPrevSection?: () => void;
  onClipChange?: (clip: ClipInfo) => void;
  videoLoaded?: boolean;
  hasSlidesForSection?: boolean;
  onHasSlideAtCurrentTimeChange?: (hasSlide: boolean) => void;
}) {
  const playerRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const videoPlayer = useRef<any>(null);
  const presentationPlayerRef = useRef<HTMLVideoElement | null>(null);
  const presentationVideoPlayer = useRef<any>(null);
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
  const [isAwayFromSlide, setIsAwayFromSlide] = useState(false);
  const [showConcepts, setShowConcepts] = useState(true);
  const [hasSlideAtCurrentTime, setHasSlideAtCurrentTime] = useState(false);
  const lastHasSlideAtCurrentTime = useRef<boolean | null>(null);

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

  const hasSlides = useMemo(() => {
    if (typeof hasSlidesForSection === 'boolean') return hasSlidesForSection;
    return false;
  }, [hasSlidesForSection]);
  const masterVideoUrl = presenterVideoId || videoId;
  const currentSlideClipRange = useMemo(() => {
    if (!currentSlideUri || !currentSectionId || !slidesClipInfo || !clipId) return null;  
    const slideClips = slidesClipInfo[currentSectionId]?.[currentSlideUri];
    if (!slideClips || !Array.isArray(slideClips) || slideClips.length === 0) return null;
    const matchingClip = slideClips.find((clip: ClipInfo) => clip.video_id === clipId);
    if (
      !matchingClip ||
      matchingClip.start_time === undefined ||
      matchingClip.end_time === undefined
    ) {
      return null;
    }
    
    return {
      start: matchingClip.start_time,
      end: matchingClip.end_time,
    };
  }, [currentSlideUri, currentSectionId, slidesClipInfo, clipId]);

  // Calculate first slide's start time for the selected section (for warning when video doesn't match)
  const selectedSectionFirstSlideTime = useMemo(() => {
    if (!currentSectionId || !slidesClipInfo || !slidesUriToIndexMap) return null;
    
    const sectionSlides = slidesUriToIndexMap[currentSectionId];
    if (!sectionSlides || Object.keys(sectionSlides).length === 0) return null;
    
    // Find the first slide (index 0)
    const firstSlideUri =
      Object.keys(sectionSlides).find((slideUri) => sectionSlides[slideUri] === 0) ||
      Object.keys(sectionSlides)[0];
    
    if (!firstSlideUri || !slidesClipInfo[currentSectionId]?.[firstSlideUri]) return null;
    
    const slideClips = slidesClipInfo[currentSectionId][firstSlideUri];
    if (!Array.isArray(slideClips) || slideClips.length === 0) return null;
    
    // Find clip that matches the current clipId, or use the first one
    const matchingClip = clipId
      ? slideClips.find((clip: ClipInfo) => clip.video_id === clipId)
      : null;
    const clipToUse = matchingClip || slideClips[0];
    
    return clipToUse.start_time !== undefined ? clipToUse.start_time : null;
  }, [currentSectionId, slidesClipInfo, slidesUriToIndexMap, clipId]);

  useEffect(() => {
    const player = videoPlayer.current;
    if (!player) return;

    const onTimeUpdate = () => {
      const t = player.currentTime();
      
      if (currentSlideClipRange) {
        // Check if away from current slide
        setIsAwayFromSlide(t < currentSlideClipRange.start || t > currentSlideClipRange.end);
      } else if (selectedSectionFirstSlideTime !== null && videoLoaded) {
        // If no current slide clip range but we have a selected section's first slide time,
        // check if video is not at that time (within a small threshold)
        const threshold = 2; // 2 seconds threshold
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

  const markersInDescOrder = useMemo(() => {
    return (markers ?? []).slice().sort((a, b) => b.time - a.time);
  }, [markers]);

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
        sources: [{ src: masterVideoUrl, type: 'video/mp4' }],
      });
      videoPlayer.current = player;
      player.load();
      player.ready(() => {
        const controlBar = playerRef.current.parentNode?.querySelector(
          '.vjs-control-bar'
        ) as HTMLElement;
        if (controlBar) {
          controlBar.style.paddingBottom = '30px';
          controlBar.style.paddingTop = '10px';
          controlBar.style.position = 'absolute';
          controlBar.style.bottom = '0';
          controlBar.style.left = '0';
          controlBar.style.right = '0';
          controlBar.style.width = '100%';
          controlBar.style.zIndex = '1000';
        }
      });
    } else {
      const currentTime = player.currentTime();
      player.src({ src: masterVideoUrl, type: 'video/mp4' });
      player.load();
      player.ready(() => {
        player.currentTime(currentTime);
        player.play();
        const controlBar = playerRef.current.parentNode?.querySelector(
          '.vjs-control-bar'
        ) as HTMLElement;
        if (controlBar) {
          controlBar.style.paddingBottom = '30px';
          controlBar.style.paddingTop = '10px';
          controlBar.style.position = 'absolute';
          controlBar.style.bottom = '0';
          controlBar.style.left = '0';
          controlBar.style.right = '0';
          controlBar.style.width = '100%';
          controlBar.style.zIndex = '1000';
        }
      });
    }

    const applyControlBarStyles = () => {
      const root = playerRef.current?.parentNode as HTMLElement | null;
      if (!root) return;

      const controlBar = root.querySelector('.vjs-control-bar') as HTMLElement | null;
      if (controlBar) {
        controlBar.style.paddingBottom = '30px';
        controlBar.style.paddingTop = '10px';
        controlBar.style.position = 'absolute';
        controlBar.style.bottom = '0';
        controlBar.style.left = '0';
        controlBar.style.right = '0';
        controlBar.style.width = '100%';
        controlBar.style.zIndex = '1000';
        controlBar.style.visibility = 'visible';
        controlBar.style.opacity = '1';
        controlBar.style.display = 'flex';

        const playPauseButton = controlBar.querySelector('.vjs-play-control') as HTMLElement | null;
        if (playPauseButton) {
          playPauseButton.style.visibility = 'visible';
          playPauseButton.style.opacity = '1';
          playPauseButton.style.display = 'block';
        }
      }

      const progressBar = root.querySelector('.vjs-progress-holder') as HTMLElement | null;
      if (progressBar) {
        progressBar.style.marginTop = '20px';
      }

      const bigPlayButton = root.querySelector('.vjs-big-play-button') as HTMLElement | null;
      const playIcon = bigPlayButton?.querySelector('.vjs-icon-placeholder') as HTMLElement | null;
      if (playIcon) {
        playIcon.style.bottom = '5px';
        playIcon.style.paddingRight = '25px';
      }

      const textTrackDisplay = root.querySelector('.vjs-text-track-display') as HTMLElement | null;
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
    };
    applyControlBarStyles();
    const timeoutId = setTimeout(applyControlBarStyles, 100);
    return () => {
      clearTimeout(timeoutId);
      if (audioOnly && player) {
        player.dispose();
        videoPlayer.current = null;
      }
    };
  }, [masterVideoUrl, audioOnly]);

  const presentationVideoUrl = presentationVideoId || compositeVideoId;
  useEffect(() => {
    const shouldShowPresentation =
      !!presentationVideoUrl && (!hasSlides || !hasSlideAtCurrentTime || showPresentationVideo);

    if (!shouldShowPresentation || audioOnly) {
      if (presentationVideoPlayer.current) {
        try {
        presentationVideoPlayer.current.dispose();
        } catch (e) {
          // Ignore disposal errors
        }
        presentationVideoPlayer.current = null;
      }
      return;
    }
    if (!presentationPlayerRef.current) {
      const timeoutId = setTimeout(() => {
        if (presentationPlayerRef.current && !presentationVideoPlayer.current) {
          // Element is now available, will be handled in next effect run
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }

    let player = presentationVideoPlayer.current;
    const isDisposed = player && typeof (player as any).isDisposed === 'function' && (player as any).isDisposed();
    
    if (!player || isDisposed) {
      try {
      player = videojs(presentationPlayerRef.current, {
        controls: false,
        preload: 'auto',
        autoplay: false,
        muted: true,
        sources: [{ src: presentationVideoUrl, type: 'video/mp4' }],
      });

      presentationVideoPlayer.current = player;
      player.muted(true);
        player.load();

        player.ready(() => {
          const master = videoPlayer.current;
          if (!master) {
            setTimeout(() => {
              const masterRetry = videoPlayer.current;
              if (masterRetry && player && !player.isDisposed?.()) {
                player.currentTime(masterRetry.currentTime());
                if (!masterRetry.paused()) {
                  player.play().catch(() => {
                    // autoplay may fail due to browser policy
                  });
                }
              }
            }, 200);
            return;
          }

          player.currentTime(master.currentTime());
          if (!master.paused()) {
            player.play().catch(() => {
              // autoplay may fail due to browser policy
            });
          }
        });

        return;
      } catch (e) {
        console.error('Error initializing presentation video player:', e);
        return;
      }
    }

    let currentSrc = '';
    try {
      currentSrc = player.currentSrc() || '';
    } catch (e) {
      // If currentSrc() fails, assume we need to update
      currentSrc = '';
    }

    if (currentSrc !== presentationVideoUrl) {
      const master = videoPlayer.current;
      const syncTime = master ? master.currentTime() : (player.currentTime() || 0);
      
      player.src({ src: presentationVideoUrl, type: 'video/mp4' });
      player.load();
      player.ready(() => {
        player.currentTime(syncTime);
        const master = videoPlayer.current;
        if (master && !master.paused()) {
          player.play().catch(() => {
            // autoplay may fail due to browser policy
      });
    }
      });
    } else if (!hasSlides) {
      const master = videoPlayer.current;
      if (master) {
        player.load();
        const syncAfterLoad = () => {
          if (player && !player.isDisposed?.() && master) {
            const masterTime = master.currentTime();
            player.currentTime(masterTime);
            if (!master.paused() && player.paused()) {
              player.play().catch(() => {
                // autoplay may fail due to browser policy
              });
            } else if (master.paused() && !player.paused()) {
              player.pause();
            }
          }
        };

        if (player.readyState() >= 2) {
          syncAfterLoad();
        } else {
          player.ready(() => {
            syncAfterLoad();
          });
        }
      } else {
        player.load();
      }
    }
  }, [presentationVideoUrl, hasSlides, hasSlideAtCurrentTime, showPresentationVideo, audioOnly]);

  useEffect(() => {
    const masterPlayer = videoPlayer.current;
    const presentationPlayer = presentationVideoPlayer.current;
    const shouldSync = !hasSlides || !hasSlideAtCurrentTime || showPresentationVideo;
    if (!masterPlayer || !presentationPlayer || !shouldSync || audioOnly) return;
    if (typeof (presentationPlayer as any).isDisposed === 'function' && (presentationPlayer as any).isDisposed()) {
      return;
    }
    const syncPlayers = () => {
      if (masterPlayer && presentationPlayer) {
        const masterTime = masterPlayer.currentTime();
        const masterPaused = masterPlayer.paused();

        if (Math.abs(presentationPlayer.currentTime() - masterTime) > 0.5) {
          presentationPlayer.currentTime(masterTime);
        }

        if (masterPaused && !presentationPlayer.paused()) {
          presentationPlayer.pause();
        } else if (!masterPaused && presentationPlayer.paused()) {
          presentationPlayer.play().catch((err) => {
            console.log('Play failed:', err);
          });
        }
      }
    };
    syncPlayers();

    const handlePlay = () =>
      presentationPlayer?.play().catch((err) => console.log('Play failed:', err));
    const handlePause = () => presentationPlayer?.pause();

    masterPlayer.on('play', handlePlay);
    masterPlayer.on('pause', handlePause);
    masterPlayer.on('seeked', syncPlayers);
    masterPlayer.on('timeupdate', syncPlayers);

    return () => {
      masterPlayer.off('play', handlePlay);
      masterPlayer.off('pause', handlePause);
      masterPlayer.off('seeked', syncPlayers);
      masterPlayer.off('timeupdate', syncPlayers);
    };
  }, [hasSlides, showPresentationVideo, hasSlideAtCurrentTime, audioOnly]);
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
      const hasSlide = !!latestMarker;

      if (hasSlideAtCurrentTime !== hasSlide) {
        setHasSlideAtCurrentTime(hasSlide);
      }
      if (lastHasSlideAtCurrentTime.current !== hasSlide) {
        lastHasSlideAtCurrentTime.current = hasSlide;
        onHasSlideAtCurrentTimeChange?.(hasSlide);
      }

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
      } else {
        lastSyncedMarkerTime.current = null;
      }
    };

    player.on('timeupdate', onTimeUpdate);
    return () => {
      player.off('timeupdate', onTimeUpdate);
    };
  }, [markersInDescOrder, slidesUriToIndexMap, router]);

  useEffect(() => {
    if (videoPlayer.current && timestampSec !== undefined) {
      videoPlayer.current.currentTime(timestampSec);
    }
  }, [timestampSec]);

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
        style={{ width: '100%', background: '#f1f3f4' }}
        ref={playerRef}
      ></audio>
    );
  }
  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: 2,
          marginBottom: '7px',
        }}
      >
        <Box
          sx={{
            flex: '1 1 50%',
            position: 'relative',
            '& .video-js': {
              position: 'relative',
            },
          }}
        >
          <video
            key="videoPlayer"
            poster={thumbnail}
            ref={playerRef as MutableRefObject<HTMLVideoElement>}
            className="video-js vjs-fluid vjs-styles=defaults vjs-big-play-centered"
            style={{ border: '0.5px solid black', borderRadius: '8px' }}
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
        {presentationVideoUrl &&
          (!hasSlides || !hasSlideAtCurrentTime || showPresentationVideo) && (
            <Box sx={{ flex: '1 1 50%', position: 'relative' }}>
              <video
                ref={presentationPlayerRef as MutableRefObject<HTMLVideoElement>}
                className="video-js vjs-fluid vjs-styles=defaults"
                style={{ border: '0.5px solid black', borderRadius: '8px' }}
                muted
              />
            </Box>
          )}
      </Box>
      {isAwayFromSlide && (currentSlideClipRange || selectedSectionFirstSlideTime !== null) && (
        <Tooltip
          title={
            currentSlideClipRange
              ? `Slide starts at ${formatTime(currentSlideClipRange.start)}`
              : selectedSectionFirstSlideTime !== null
              ? `Section's first slide starts at ${formatTime(selectedSectionFirstSlideTime)}`
              : ''
          }
          arrow
        >
          <IconButton
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: '#fff3cd',
              color: '#856404',
              border: '1px solid #ffeeba',
              zIndex: 20,
              '&:hover': {
                bgcolor: '#ffecb5',
              },
            }}
            onClick={() => {
              const targetTime = currentSlideClipRange
                ? currentSlideClipRange.start
                : selectedSectionFirstSlideTime;
              if (targetTime !== null && targetTime !== undefined) {
                videoPlayer.current?.currentTime(targetTime);
              }
            }}
          >
            ⚠️
          </IconButton>
        </Tooltip>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <Tooltip title={showConcepts ? 'Hide concepts' : 'Show concepts'} arrow>
          <IconButton
            size="small"
            onClick={() => setShowConcepts((prev) => !prev)}
            sx={{
              bgcolor: showConcepts ? '#1d4ed8' : '#e5e7eb',
              color: showConcepts ? '#ffffff' : '#111827',
              border: '1px solid rgba(148, 163, 184, 0.7)',
              '&:hover': {
                bgcolor: showConcepts ? '#1e40af' : '#d1d5db',
              },
            }}
          >
            <MenuBookIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {showConcepts && overlay && (
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
              onClick={() => setShowConcepts(false)}
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
    </Box>
  );
}
