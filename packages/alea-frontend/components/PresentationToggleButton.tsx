import { Box, IconButton, Tooltip } from '@mui/material';
import SlideshowIcon from '@mui/icons-material/Slideshow';

interface Props {
  showPresentationVideo: boolean;
  hasSlideAtCurrentTime: boolean;
  onToggle: () => void;
  inline?: boolean;
}

export function PresentationToggleButton({
  showPresentationVideo,
  hasSlideAtCurrentTime,
  onToggle,
  inline = false,
}: Props) {
  const tooltipTitle = !hasSlideAtCurrentTime
    ? 'No slides available at current time'
    : showPresentationVideo
    ? 'Show slides'
    : 'Show presentation video';

  const baseStyles = {
    bgcolor: showPresentationVideo ? 'rgba(59, 130, 246, 0.9)' : 'rgba(0, 0, 0, 0.6)',
    color: '#fff',
    backdropFilter: 'blur(4px)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
    '&:hover': {
      bgcolor: showPresentationVideo ? 'rgba(37, 99, 235, 0.95)' : 'rgba(0, 0, 0, 0.8)',
      transform: 'scale(1.05)',
    },
    '&.Mui-disabled': {
      bgcolor: 'rgba(0, 0, 0, 0.3)',
      color: 'rgba(255, 255, 255, 0.4)',
      border: '2px solid rgba(255, 255, 255, 0.1)',
    },
  };

  const inlineStyles = inline
    ? {
        position: 'relative' as const,
        zIndex: 1,
      }
    : {
        position: 'relative' as const,
        zIndex: 1,
      };

  const button = (
    <IconButton
      size="medium"
      disabled={!hasSlideAtCurrentTime}
      onClick={onToggle}
      sx={{
        ...baseStyles,
        ...inlineStyles,
      }}
    >
      <SlideshowIcon fontSize="medium" />
    </IconButton>
  );
  
  if (inline) {
    return (
      <Tooltip title={tooltipTitle} arrow placement="top">
        {button}
      </Tooltip>
    );
  }

  return (
    <Tooltip
      title={tooltipTitle}
      arrow
      placement="left"
      PopperProps={{
        modifiers: [
          {
            name: 'offset',
            options: {
              offset: [0, 8],
            },
          },
        ],
        style: {
          zIndex: 1001,
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 8, sm: 12 },
          right: { xs: 8, sm: 12 },
          zIndex: 1000,
        }}
      >
        {button}
      </Box>
    </Tooltip>
  );
}