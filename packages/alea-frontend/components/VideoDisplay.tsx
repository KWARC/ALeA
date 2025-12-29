import { InfoOutlined } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Button, CircularProgress, IconButton, Paper, Typography } from '@mui/material';
import { ClipDetails, ClipInfo, ClipMetadata, Slide } from '@alea/spec';
import { formatTime, localStore } from '@alea/utils';
import axios from 'axios';
import { useRouter } from 'next/router';
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { MediaItem, Marker } from './MediaItem';

export interface SlidesUriToIndexMap {
  [sectionId: string]: {
    [slideUri: string]: number;
  };
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
  courseId,
  slidesClipInfo,
  videoLoaded,
  showPresentationVideo,
  hasSlidesForSection,
  onHasSlideAtCurrentTimeChange,
  sectionTitle,
  onPresentationVideoToggle,
}: {
  clipId: string;
  clipIds: { [sectionId: string]: string };
  setCurrentClipId: Dispatch<SetStateAction<string>>;
  timestampSec?: number;
  setTimestampSec?: Dispatch<SetStateAction<number>>;
  currentSlideClipInfo?: ClipInfo;
  audioOnly: boolean;
  showPresentationVideo?: boolean;
  hasSlidesForSection?: boolean;
  onHasSlideAtCurrentTimeChange?: (hasSlide: boolean) => void;
  videoExtractedData?: {
    [timestampSec: number]: ClipMetadata;
  };
  slidesUriToIndexMap?: SlidesUriToIndexMap;
  onVideoLoad: (status: boolean) => void;
  onVideoTypeChange?: (hasPresentationOrComposite: boolean) => void;
  videoMode?: 'presenter' | 'presentation' | null;
  currentSectionId?: string;
  currentSlideUri?: string;
  courseId?: string;
  slidesClipInfo?: {
    [sectionId: string]: {
      [slideUri: string]: ClipInfo[];
    };
  };
  videoLoaded?: boolean;
  sectionTitle?: string;
  onPresentationVideoToggle?: () => void;
}) {
  const [resolution] = useState(+(localStore?.getItem('defaultResolution') || '720'));
  const [clipDetails, setClipDetails] = useState(undefined as ClipDetails);
  const availableRes = getAvailableRes(clipDetails);
  const presenterVideoId = getVideoId(clipDetails, resolution, availableRes);
  const compositeVideoId = ((clipDetails as Record<string, unknown>)?.compositeUrl ||
    (clipDetails as Record<string, unknown>)?.composite_url) as string | undefined;
  const presentationVideoId = ((clipDetails as Record<string, unknown>)?.presentationUrl ||
    (clipDetails as Record<string, unknown>)?.presentation_url) as string | undefined;
  const defaultVideoId = useMemo(() => {
    if (videoMode === 'presenter') {
      return presenterVideoId || compositeVideoId || presentationVideoId;
    } else if (videoMode === 'presentation') {
      return presentationVideoId || compositeVideoId || presenterVideoId;
    } else {
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
        <MediaItem
          videoId={defaultVideoId}
          presenterVideoId={presenterVideoId}
          compositeVideoId={compositeVideoId}
          presentationVideoId={presentationVideoId}
          clipId={clipId}
          clipIds={clipIds}
          sectionTitle={sectionTitle}
          timestampSec={timestampSec}
          showPresentationVideo={showPresentationVideo}
          onPresentationVideoToggle={onPresentationVideoToggle}
          audioOnly={audioOnly}
          subtitles={clipDetails?.subtitles}
          thumbnail={clipDetails?.thumbnailUrl}
          markers={markers}
          slidesUriToIndexMap={slidesUriToIndexMap}
          onVideoTypeChange={onVideoTypeChange}
          currentSectionId={currentSectionId}
          currentSlideUri={currentSlideUri}
          courseId={courseId}
          slidesClipInfo={slidesClipInfo}
          videoLoaded={videoLoaded}
          hasSlidesForSection={hasSlidesForSection}
          onHasSlideAtCurrentTimeChange={onHasSlideAtCurrentTimeChange}
        />
        <Box
          onKeyDown={handleKeyPress}
          onKeyUp={handleKeyRelease}
          tabIndex={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            mb: reveal || showOverlay ? 0.5 : 0,
            height: reveal || showOverlay ? 'auto' : 0,
            overflow: 'hidden',
          }}
        >
          {(reveal || showOverlay) && (
            <Button
              onDoubleClick={() => setShowOverlay((prev) => !prev)}
              sx={{
                minWidth: 0,
                p: 0.5,
              }}
            >
              <InfoOutlined />
            </Button>
          )}

          {showOverlay && (
            <DraggableOverlay
              showOverlay={showOverlay}
              setShowOverlay={setShowOverlay}
              data={{ parentClipId: clipId, currentSlideClipInfo }}
            />
          )}
        </Box>
      </Box>
    </>
  );
}
