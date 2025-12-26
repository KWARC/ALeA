import { SxProps, Theme } from '@mui/material';

export interface VideoControllerStylesParams {
  hasPresenterVideo: boolean;
  isPresentationVideoShowing: boolean;
  shouldMakeControlBarFullWidth: boolean;
}

export const getVideoContainerStyles = (): SxProps<Theme> => ({
  flex: { xs: '1 1 auto', md: '1 1 50%' },
  position: 'relative',
  width: '100%',
  maxWidth: '100%',
  '& .video-js': {
    position: 'relative',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  '& video': {
    width: '100%',
    height: 'auto',
  },
  '& .vjs-control-bar': {
    position: 'relative !important' as any,
    bottom: 'auto !important' as any,
  },
});

export const getVideoStyles = (): React.CSSProperties => ({
  border: '0.5px solid black',
  borderRadius: '8px',
  width: '100%',
  maxWidth: '100%',
});

export const getVideoContainerWrapperStyles = (
  params: VideoControllerStylesParams
): SxProps<Theme> => {
  const { shouldMakeControlBarFullWidth } = params;

  return {
    display: 'flex',
    flexDirection: { xs: 'column', md: 'row' },
    gap: { xs: 1.5, md: 2 },
    position: 'relative',
    ...(shouldMakeControlBarFullWidth && getFullWidthControlBarStyles()),
  };
};

export const getFullWidthControlBarStyles = (): SxProps<Theme> => ({
  '& > div:first-of-type': {
    position: 'relative',
    overflow: 'visible',
    '& .video-js': {
      display: 'flex !important' as any,
      flexDirection: 'column !important' as any,
      position: 'relative',
    },
    '& .vjs-control-bar': {
      display: 'flex !important' as any,
      flexDirection: 'row !important' as any,
      flexWrap: 'nowrap !important' as any,
      alignItems: 'center !important' as any,
      justifyContent: 'space-between !important' as any,
      height: '44px !important' as any,
      padding: '0 12px !important' as any,
    },
  },
  '& > div:nth-of-type(2) .vjs-control-bar': {
    display: 'none !important' as any,
  },
  paddingBottom: { xs: '56px', md: '56px' },
  '@media (min-width: 960px)': {
    '& > div:first-of-type .vjs-control-bar': {
      width: 'calc(200% + 16px) !important' as any,
      left: '0 !important' as any,
    },
  },
  '@media (max-width: 959px)': {
    '& > div:first-of-type': {
      overflow: 'visible',
    },
    '& > div:first-of-type .video-js': {
      overflow: 'visible !important' as any,
      position: 'relative !important' as any,
    },
    '& > div:first-of-type .vjs-control-bar': {
      position: 'absolute !important' as any,
      top: 'calc(200% + 12px) !important' as any,
      bottom: 'auto !important' as any,
      left: '0 !important' as any,
      right: '0 !important' as any,
      width: '100% !important' as any,
      marginTop: '0 !important' as any,
      zIndex: 10,
      pointerEvents: 'auto !important' as any,
      visibility: 'visible !important' as any,
      opacity: '1 !important' as any,
    },
  },
});

export const shouldMakeControlBarFullWidth = (
  hasPresenterVideo: boolean,
  isPresentationVideoShowing: boolean
): boolean => {
  return hasPresenterVideo && isPresentationVideoShowing;
};

export const isPresentationVideoShowing = (
  presentationVideoUrl: string | undefined,
  hasSlides: boolean,
  hasSlideAtCurrentTime: boolean,
  showPresentationVideo: boolean,
  audioOnly: boolean
): boolean => {
  return !!(
    presentationVideoUrl &&
    (!hasSlides || !hasSlideAtCurrentTime || showPresentationVideo) &&
    !audioOnly
  );
};