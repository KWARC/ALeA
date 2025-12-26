import { formatTime } from '@alea/utils';
import { IconButton, Tooltip } from '@mui/material';

interface SlideClipRange {
  start: number;
  end: number;
}

interface AwayFromSlideWarningProps {
  isAwayFromSlide: boolean;
  currentSlideClipRange: SlideClipRange | null;
  selectedSectionFirstSlideTime: number | null;
  onJumpToSlide: () => void;
}

export function AwayFromSlideWarning({
  isAwayFromSlide,
  currentSlideClipRange,
  selectedSectionFirstSlideTime,
  onJumpToSlide,
}: AwayFromSlideWarningProps) {
  if (!isAwayFromSlide || (!currentSlideClipRange && selectedSectionFirstSlideTime === null)) {
    return null;
  }

  const tooltipTitle = currentSlideClipRange
    ? `Slide starts at ${formatTime(currentSlideClipRange.start)}`
    : selectedSectionFirstSlideTime !== null
    ? `Section's first slide starts at ${formatTime(selectedSectionFirstSlideTime)}`
    : '';

  return (
    <Tooltip title={tooltipTitle} arrow>
      <IconButton
        size="small"
        onClick={onJumpToSlide}
        sx={{
          position: 'absolute',
          top: 1,
          right: 1,
          bgcolor: '#fff3cd',
          color: '#856404',
          border: '1px solid #ffeeba',
          zIndex: 20,
          '&:hover': {
            bgcolor: '#ffecb5',
          },
        }}
      >
        ⚠️
      </IconButton>
    </Tooltip>
  );
}
