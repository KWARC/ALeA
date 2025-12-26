import { IconButton, Tooltip } from '@mui/material';
import SlideshowIcon from '@mui/icons-material/Slideshow';

interface Props {
  showPresentationVideo: boolean;
  hasSlideAtCurrentTime: boolean;
  onToggle: () => void;
}

export function PresentationToggleButton({
  showPresentationVideo,
  hasSlideAtCurrentTime,
  onToggle,
}: Props) {
  return (
    <Tooltip
      title={
        !hasSlideAtCurrentTime
          ? 'No slides available at current time'
          : showPresentationVideo
          ? 'Show slides'
          : 'Show presentation video'
      }
      arrow
      placement="left"
    >
      <span>
        <IconButton
          size="medium"
          disabled={!hasSlideAtCurrentTime}
          onClick={onToggle}
          sx={{
            position: 'absolute',
            top: { xs: 8, sm: 12 },
            right: { xs: 8, sm: 12 },
            zIndex: 1000,
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
          }}
        >
          <SlideshowIcon fontSize="medium" />
        </IconButton>
      </span>
    </Tooltip>
  );
}