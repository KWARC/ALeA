import { formatTime } from '@alea/utils';
import { useEffect, useMemo, useRef } from 'react';
import { Marker } from '../components/MediaItem';
import { SlidesUriToIndexMap } from '../components/VideoDisplay';
import { NextRouter } from 'next/router';
import { setSlideNumAndSectionId } from '../utils/courseViewUtils';

export interface UseVideoMarkersOptions {
  videoPlayer: React.MutableRefObject<any>;
  markers: Marker[] | undefined;
  timestampSec?: number;
  setTooltip: (tooltip: string) => void;
  handleMarkerClick: (marker: Marker) => void;
  slidesUriToIndexMap?: SlidesUriToIndexMap;
  router: NextRouter;
  hasSlideAtCurrentTime: boolean;
  setHasSlideAtCurrentTime: (hasSlide: boolean) => void;
  onHasSlideAtCurrentTimeChange?: (hasSlide: boolean) => void;
  autoSyncEnabled: boolean;
}

export function useVideoMarkers({
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
  autoSyncEnabled,
}: UseVideoMarkersOptions) {
  const autoSyncRef = useRef(autoSyncEnabled);
  const lastSyncedMarkerTime = useRef<number | null>(null);
  const lastHasSlideAtCurrentTime = useRef<boolean | null>(null);

  const markersInDescOrder = useMemo(() => {
    return (markers ?? []).slice().sort((a, b) => b.time - a.time);
  }, [markers]);
  useEffect(() => {
    autoSyncRef.current = autoSyncEnabled;
  }, [autoSyncEnabled]);
  useEffect(() => {
    const player = videoPlayer.current;
    if (!player) return;

    const onLoadedMetadata = () => {
      const progressHolder = player.controlBar.progressControl.seekBar.el();
      const videoDuration = player.duration();
      const createdMarkers: HTMLElement[] = [];

      markers?.forEach((marker) => {
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
  }, [markers, timestampSec, videoPlayer, handleMarkerClick]);

  useEffect(() => {
    const player = videoPlayer.current;
    if (!player) return;

    const handleCurrentMarkerUpdate = () => {
      const currentTime = player.currentTime();
      const markersInDescOrder = (markers ?? []).slice().sort((a, b) => b.time - a.time);
      const markerIndex = markersInDescOrder.findIndex((marker) => marker.time <= currentTime);
      if (markerIndex < 0) return;
      const newMarker = markersInDescOrder[markerIndex];
      handleMarkerClick(newMarker);
    };

    const onPause = () => handleCurrentMarkerUpdate();
    const onSeeked = () => handleCurrentMarkerUpdate();

    player.on('pause', onPause);
    player.on('seeked', onSeeked);

    return () => {
      player.off('pause', onPause);
      player.off('seeked', onSeeked);
    };
  }, [markers, videoPlayer, handleMarkerClick]);

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
  }, [
    markersInDescOrder,
    slidesUriToIndexMap,
    router,
    videoPlayer,
    hasSlideAtCurrentTime,
    setHasSlideAtCurrentTime,
    onHasSlideAtCurrentTimeChange,
  ]);
}
