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
        if (!controlBar) {
          return;
        }

        if (!videojs.getComponent('DownloadButton')) {
          class DownloadButton extends Button {
            private clipId?: string;

            constructor(player: any, options?: any) {
              super(player, options);
              this.addClass('vjs-download-control');
              this.addClass('vjs-control');
              this.addClass('vjs-button');
              (this as any).controlText('Download');

              const el = this.el() as HTMLElement;
              el.innerHTML = '⬇';
              el.style.display = 'flex';
              el.style.alignItems = 'center';
              el.style.justifyContent = 'center';
              el.style.visibility = 'visible';
              el.style.cursor = 'pointer';
              el.style.fontSize = '1.5em';
              el.style.lineHeight = '1';
              this.on('click', this.handleClick);
            }

            setClipId = (clipId?: string) => {
              this.clipId = clipId;
              const el = this.el() as HTMLElement;

              if (clipId) {
                el.style.display = 'flex';
                el.style.visibility = 'visible';
                el.style.opacity = '1';
              } else {
                el.style.display = 'none';
              }
            };

            private handleClick = () => {
              if (!this.clipId) {
                return;
              }
              window.location.href = `/download/${this.clipId}`;
            };
          }

          videojs.registerComponent('DownloadButton', DownloadButton as any);
        }

        let downloadBtn = controlBar.getChild('DownloadButton') as any;

        if (!downloadBtn) {
          downloadBtn = controlBar.addChild('DownloadButton', {}, 7);
        }

        if (downloadBtn) {
          if (downloadBtn.setClipId) {
            downloadBtn.setClipId(clipId);
          } else {
            console.error('setClipId method NOT FOUND on download button!');
          }
        } else {
          console.error('DOWNLOAD BUTTON IS NULL/UNDEFINED AFTER ADDING!');
        }
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
        if (controlBar) {
          const downloadBtn = controlBar.getChild('DownloadButton') as any;
          if (downloadBtn && downloadBtn.setClipId) {
            downloadBtn.setClipId(clipId);
          }
        }
      });
    }

    return () => {
      if (audioOnly && player) {
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