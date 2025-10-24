import { FastForward, InfoOutlined, MusicNote } from '@mui/icons-material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import VideocamIcon from '@mui/icons-material/Videocam';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import { ClipDetails, ClipInfo, getDefiniedaInSection } from '@alea/spec';
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

import { ClipData } from '@alea/spec';
import Image from 'next/image';
import Link from 'next/link';
import { setSlideNumAndSectionId } from '../pages/course-view/[courseId]';

export default function SeekVideo({
  currentSlideClipInfo,
  setTimestampSec,
  setCurrentClipId,
}: {
  currentSlideClipInfo: ClipInfo;
  setTimestampSec: React.Dispatch<React.SetStateAction<number>>;
  setCurrentClipId: Dispatch<SetStateAction<string>>;
}) {
  const handleSeek = () => {
    if (currentSlideClipInfo) {
      const { start_time, video_id } = currentSlideClipInfo;
      setCurrentClipId(video_id);
      if (start_time) {
        setTimestampSec((prev) => (prev === start_time ? prev + 0.001 : start_time));
      } else setTimestampSec(0);
    }
  };
  if (!currentSlideClipInfo) return null;
  return (
    <Box display="inline-block" zIndex="1">
      <Tooltip title={`Seek Video to current slide`} arrow>
        <IconButton
          onClick={handleSeek}
          sx={{
            padding: '5px',
            backgroundColor: '#1976d2',
            color: 'white',
            margin: '5px',
            '&:hover': {
              backgroundColor: '#1565c0',
            },
          }}
        >
          <FastForward />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

function ToggleResolution({
  audioOnly,
  setAudioOnly,
  resolution,
  setResolution,
  availableResolutions,
}: {
  audioOnly: boolean;
  setAudioOnly: Dispatch<SetStateAction<boolean>>;
  resolution: number;
  setResolution: Dispatch<SetStateAction<number>>;
  availableResolutions: number[];
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  return (
    <Box display="flex" alignItems="center" border={'1px solid #CCC'} zIndex="1" sx={{ mb: 1 }}>
      <IconButton onClick={() => setAudioOnly(!audioOnly)}>
        <Tooltip title={audioOnly ? 'Show Video' : 'Audio Only'}>
          {audioOnly ? <VideocamIcon /> : <MusicNote />}
        </Tooltip>
      </IconButton>
      {!audioOnly && (
        <>
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <SettingsIcon />
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            {availableResolutions.map((res) => (
              <MenuItem key={res} onClick={() => setResolution(res)}>
                <CheckIcon
                  fontSize="small"
                  sx={{ color: res === resolution ? undefined : '#00000000' }}
                />
                &nbsp;{res}p
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </Box>
  );
}

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
  autoSync,
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
  autoSync?: boolean;
}) => {
  const playerRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const videoPlayer = useRef<any>(null);
  const autoSyncRef = useRef(autoSync);
  const lastSyncedMarkerTime = useRef<number | null>(null);
  const [tooltip, setTooltip] = useState<string>('');
  const [overlay, setOverlay] = useState<{ title: string; description: string } | null>(null);
  const router = useRouter();
  const [conceptsUri, setConceptsUri] = useState<string[]>([]);
  const [loadingConcepts, setLoadingConcepts] = useState(false);
  const conceptsCache = useRef<Record<string, string[]>>({});
  const markersInDescOrder = useMemo(() => {
    return [...markers].sort((a, b) => b.time - a.time);
  }, [markers]);

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
      const definedConcepts = await getDefiniedaInSection(sectionUri);
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
    autoSyncRef.current = autoSync;
  }, [autoSync]);

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
        sources: [{ src: videoId, type: 'video/mp4' }],
      });
      videoPlayer.current = player;
    } else {
      const currentTime = player.currentTime();
      player.src({ src: videoId, type: 'video/mp4' });
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
  }, [videoId, audioOnly]);
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

    player.on('playing', () => setOverlay(null));
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

      if (!autoSyncRef.current || markersInDescOrder.length === 0) return;

      const latestMarker = markersInDescOrder.find((marker) => marker.time <= currentTime);
      if (!latestMarker) return;

      const sectionId = latestMarker.data?.sectionId;
      const slideUri = latestMarker.data?.slideUri;
      const slideIndex = slidesUriToIndexMap?.[sectionId]?.[slideUri];

      if (lastSyncedMarkerTime.current !== latestMarker.time && clipIds?.[sectionId] === clipId) {
        lastSyncedMarkerTime.current = latestMarker.time;
        setSlideNumAndSectionId(router, (slideIndex ?? -1) + 1, sectionId);
      }
    };

    player.on('timeupdate', onTimeUpdate);
    return () => {
      player.off('timeupdate', onTimeUpdate);
    };
  }, [markersInDescOrder, clipIds, slidesUriToIndexMap, router, clipId]);

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

    const closestMarker = markers.find((marker) => Math.abs(marker.time - timeAtCursor!) < 1);

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

      {overlay && (
        <Box
          style={{
            position: 'absolute',
            top: '47%',
            left: '0',
            width: '35%',
            height: '38%',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            zIndex: '100',

            padding: '10px ',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {conceptsUri && conceptsUri.length > 0 ? (
            <>
              <Typography
                variant="h5"
                sx={{
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '1rem',
                  color: '#d7e4fa',
                  marginBottom: '8px',
                }}
              >
                Concepts in this section
              </Typography>
              {loadingConcepts ? (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <CircularProgress color="primary" />
                  <Typography variant="body2" color="white" mt={1}>
                    Loading concepts...
                  </Typography>
                </Box>
              ) : (
                conceptsUri.map((uri, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: '90%',
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      color: '#fff',
                      padding: '12px',
                      borderRadius: '10px',
                      textAlign: 'center',
                      display: 'flex',
                      marginBottom: '10px',
                      transition: 'transform 0.5s ease-in-out',
                      '&:hover': {
                        transform: 'rotateY(10deg)',
                      },
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontSize: '1.2rem',
                        fontWeight: '600',

                        whiteSpace: 'normal',
                        wordWrap: 'break-word',
                        width: '85%',
                      }}
                      title={uri}
                    >
                      {getParamFromUri(uri, 's') ?? uri}
                    </Typography>
                    <Link
                      href={PathToTour2(uri)}
                      target="_blank"
                      style={{ textDecoration: 'none' }}
                    >
                      <Tooltip title="Take a guided tour" arrow>
                        <IconButton
                          sx={{
                            backgroundColor: '#fff',
                            borderRadius: '50%',
                            padding: '2px',
                            '&:hover': {
                              backgroundColor: '#f0f0f0',
                              transform: 'scale(1.2)',
                              transition: 'transform 0.2s ease-in-out',
                            },
                          }}
                        >
                          <Image
                            src="/guidedTour.png"
                            alt="Tour Logo"
                            width={25}
                            height={25}
                            priority
                          />
                        </IconButton>
                      </Tooltip>
                    </Link>
                  </Box>
                ))
              )}
            </>
          ) : (
            <Typography
              variant="h6"
              sx={{
                textAlign: 'center',
                fontWeight: 'bold',
                color: '#ccc',
                marginTop: '12px',
              }}
            >
              No new concepts defined in this section
            </Typography>
          )}

          <IconButton
            onClick={() => setOverlay(null)}
            sx={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              backgroundColor: 'rgba(255, 0, 0, 0.7)',
              color: '#fff',
              borderRadius: '50%',
              padding: '5px',
              '&:hover': { backgroundColor: 'rgba(255, 0, 0, 0.9)' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      )}
    </Box>
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
  autoSync,
  onVideoLoad,
}: {
  clipId: string;
  clipIds: { [sectionId: string]: string };
  setCurrentClipId: Dispatch<SetStateAction<string>>;
  timestampSec?: number;
  setTimestampSec?: Dispatch<SetStateAction<number>>;
  currentSlideClipInfo?: ClipInfo;
  audioOnly: boolean;
  videoExtractedData?: {
    [timestampSec: number]: ClipData;
  };
  slidesUriToIndexMap?: SlidesUriToIndexMap;
  autoSync?: boolean;
  onVideoLoad: (status: boolean) => void;
}) {
  const [resolution, setResolution] = useState(720);
  const [clipDetails, setClipDetails] = useState(undefined as ClipDetails);
  const availableRes = getAvailableRes(clipDetails);
  const videoId = getVideoId(clipDetails, resolution, availableRes);
  const [isLoading, setIsLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);
  const [reveal, setReveal] = useState(false);
  const router = useRouter();
  const extractedValues = Object.values(videoExtractedData || {});
  const markers = extractedValues
    .filter((item: any) => {
      return (item.sectionId || '').trim() !== '' && (item.slideUri || '').trim() !== '';
    })
    .map((item: any) => ({
      time: Math.floor(item.start_time ?? 0),
      label: item.sectionTitle || 'Untitled',
      data: {
        thumbnail: item.thumbnail || null,
        ocr_slide_content: item.ocr_slide_content || null,
        sectionId: item.sectionId,
        sectionUri: item.sectionUri,
        slideUri: item.slideUri,
      },
    }));

  useEffect(() => {
    if (!clipId) {
      setIsLoading(false);
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
  const handleKeyPress = (e) => {
    if (e.key === 'Shift') setReveal(true);
  };

  const handleKeyRelease = (e) => {
    if (e.key === 'Shift') setReveal(false);
  };
  useEffect(() => {
    const isVideoLoaded = !isLoading && !!videoId;
    onVideoLoad(isVideoLoaded);
  }, [isLoading, videoId, onVideoLoad]);

  if (isLoading) return <CircularProgress sx={{ mb: '15px' }} />;
  if (!videoId)
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
        <MediaItem
          videoId={videoId}
          clipId={clipId}
          clipIds={clipIds}
          timestampSec={timestampSec}
          audioOnly={audioOnly}
          subtitles={clipDetails?.subtitles}
          thumbnail={clipDetails?.thumbnailUrl}
          markers={markers}
          slidesUriToIndexMap={slidesUriToIndexMap}
          autoSync={autoSync}
        />
        <Box sx={{ display: 'flex', m: '-4px 0 10px' }}>
          <ToggleResolution
            audioOnly={audioOnly}
            setAudioOnly={(v: boolean) => {
              const audioOnlyStr = v.toString();
              localStore?.setItem('audioOnly', audioOnlyStr);
              router.query.audioOnly = audioOnlyStr;
              router.replace(router);
            }}
            resolution={resolution}
            setResolution={(res: number) => {
              setResolution(res);
              localStore?.setItem('defaultResolution', res.toString());
            }}
            availableResolutions={availableRes}
          />
          {!audioOnly && (
            <SeekVideo
              currentSlideClipInfo={currentSlideClipInfo}
              setTimestampSec={setTimestampSec}
              setCurrentClipId={setCurrentClipId}
            />
          )}
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
      </Box>
    </>
  );
}
