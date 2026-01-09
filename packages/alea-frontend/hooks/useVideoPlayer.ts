import { useEffect, useRef } from 'react';
import videojs from 'video.js';

export interface UseVideoPlayerOptions {
  playerRef: React.RefObject<HTMLVideoElement | HTMLAudioElement>;
  masterVideoUrl: string;
  audioOnly: boolean;
  timestampSec?: number;
  applyVideoPlayerStyles: (root: HTMLElement) => void;
  clipId?: string;
}

export function useVideoPlayer({
  playerRef,
  masterVideoUrl,
  audioOnly,
  timestampSec,
  clipId,
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
        playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
        controlBar: {
          playbackRateMenuButton: true,
        },
        sources: [{ src: masterVideoUrl, type: 'video/mp4' }],
      });
      videoPlayer.current = player;
      player.load();
      player.ready(() => {
        const root = playerRef.current?.parentNode as HTMLElement;
        if (root) applyVideoPlayerStyles(root);

        const Button = videojs.getComponent('Button');
        const controlBar = player.getChild('controlBar');
        if (!controlBar) return;
        if (!videojs.getComponent('OpenInNewTabButton')) {
          class OpenInNewTabButton extends Button {
            private clipId?: string;
            constructor(player: any, options?: any) {
              super(player, options);
              this.addClass('vjs-control');
              this.addClass('vjs-button');
              this.addClass('vjs-open-new-tab');
              (this as any).controlText('Open in new tab');

              const el = this.el() as HTMLElement;
              el.innerHTML = '⎋';
              el.style.transform = 'rotate(90deg)';
              el.style.display = 'flex';
              el.style.alignItems = 'center';
              el.style.justifyContent = 'center';
              el.style.fontSize = '1.4em';
              el.style.cursor = 'pointer';

              this.on('click', this.handleClick);
            }

            setClipId = (clipId?: string) => {
              this.clipId = clipId;
              const el = this.el() as HTMLElement;
              el.style.display = clipId ? 'flex' : 'none';
            };

            private handleClick = () => {
              if (!this.clipId) return;
              window.open(
                `https://www.fau.tv/clip/id/${this.clipId}`,
                '_blank',
                'noopener,noreferrer'
              );
            };
          }

          videojs.registerComponent('OpenInNewTabButton', OpenInNewTabButton as any);
        }

        let openBtn = controlBar.getChild('OpenInNewTabButton') as any;
        if (!openBtn) {
          openBtn = controlBar.addChild('OpenInNewTabButton', {}, 7);
        }

        openBtn?.setClipId?.(clipId);
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
        const controlBar = player.getChild('controlBar');
        const openBtn = controlBar?.getChild('OpenInNewTabButton') as any;
        openBtn?.setClipId?.(clipId);
      });
    }

    return () => {
      if (player) {
        player.pause();
        player.dispose();
        videoPlayer.current = null;
      }
    };
  }, [masterVideoUrl, audioOnly, playerRef, applyVideoPlayerStyles, clipId]);

  useEffect(() => {
    if (videoPlayer.current && timestampSec !== undefined) {
      videoPlayer.current.currentTime(timestampSec);
    }
  }, [timestampSec]);

  return videoPlayer;
}
