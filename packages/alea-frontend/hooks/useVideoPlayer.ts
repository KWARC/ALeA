import { useEffect, useRef } from 'react';
import videojs from 'video.js';

export interface UseVideoPlayerOptions {
  playerRef: React.RefObject<HTMLVideoElement | HTMLAudioElement>;
  masterVideoUrl: string;
  audioOnly: boolean;
  timestampSec?: number;
  applyVideoPlayerStyles: (root: HTMLElement) => void;
}

export function useVideoPlayer({
  playerRef,
  masterVideoUrl,
  audioOnly,
  timestampSec,
  applyVideoPlayerStyles,
}: UseVideoPlayerOptions) {
  const videoPlayer = useRef<any>(null);

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
        const root = playerRef.current?.parentNode as HTMLElement;
        if (root) applyVideoPlayerStyles(root);
      });
    } else {
      const currentTime = player.currentTime();
      player.src({ src: masterVideoUrl, type: 'video/mp4' });
      player.load();
      player.ready(() => {
        player.currentTime(currentTime);
        player.play();
        const root = playerRef.current?.parentNode as HTMLElement;
        if (root) applyVideoPlayerStyles(root);
      });
    }

    return () => {
      if (audioOnly && player) {
        player.dispose();
        videoPlayer.current = null;
      }
    };
  }, [masterVideoUrl, audioOnly, playerRef, applyVideoPlayerStyles]);

  useEffect(() => {
    if (videoPlayer.current && timestampSec !== undefined) {
      videoPlayer.current.currentTime(timestampSec);
    }
  }, [timestampSec]);

  return videoPlayer;
}
