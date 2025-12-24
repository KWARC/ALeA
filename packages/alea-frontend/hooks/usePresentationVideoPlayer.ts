import { useEffect, useRef } from 'react';
import videojs from 'video.js';

export interface UsePresentationVideoPlayerOptions {
  presentationPlayerRef: React.RefObject<HTMLVideoElement | null>;
  presentationVideoUrl: string | undefined;
  hasSlides: boolean;
  hasSlideAtCurrentTime: boolean;
  showPresentationVideo: boolean;
  audioOnly: boolean;
  masterVideoPlayer: React.MutableRefObject<any>;
}

export function usePresentationVideoPlayer({
  presentationPlayerRef,
  presentationVideoUrl,
  hasSlides,
  hasSlideAtCurrentTime,
  showPresentationVideo,
  audioOnly,
  masterVideoPlayer,
}: UsePresentationVideoPlayerOptions) {
  const presentationVideoPlayer = useRef<any>(null);

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
          const master = masterVideoPlayer.current;
          if (!master) {
            setTimeout(() => {
              const masterRetry = masterVideoPlayer.current;
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
      const master = masterVideoPlayer.current;
      const syncTime = master ? master.currentTime() : (player.currentTime() || 0);
      
      player.src({ src: presentationVideoUrl, type: 'video/mp4' });
      player.load();
      player.ready(() => {
        player.currentTime(syncTime);
        const master = masterVideoPlayer.current;
        if (master && !master.paused()) {
          player.play().catch(() => {
            // autoplay may fail due to browser policy
          });
        }
      });
    } else if (!hasSlides) {
      const master = masterVideoPlayer.current;
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
  }, [presentationVideoUrl, hasSlides, hasSlideAtCurrentTime, showPresentationVideo, audioOnly, presentationPlayerRef, masterVideoPlayer]);

  // Sync players
  useEffect(() => {
    const masterPlayer = masterVideoPlayer.current;
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
  }, [hasSlides, showPresentationVideo, hasSlideAtCurrentTime, audioOnly, masterVideoPlayer]);

  return presentationVideoPlayer;
}

