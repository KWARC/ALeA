import { FTML } from '@kwarc/ftml-viewer';
import { Box, Typography } from '@mui/material';
import { Slide } from '@stex-react/spec';
import { getSlideTitle } from './SlideSelector';
interface AutoDetectedTooltipContentProps {
  autoDetected?: {
    clipId?: string;
    sectionUri?: FTML.DocumentURI;
    slideUri?: string;
    sectionCompleted?: boolean;
  };
  getSectionName: (uri: FTML.DocumentURI) => string;
  showResolvedSectionName?: boolean;
}

export function getSlideTitleFromUri(uri: string): string {
  return getSlideTitle({ slide: { uri } } as Slide, 0);
}

export function AutoDetectedTooltipContent({
  autoDetected,
  getSectionName,
}: AutoDetectedTooltipContentProps) {
  if (!autoDetected) {
    return <Typography variant="body2">No auto-detected data available</Typography>;
  }

  const sectionName = getSectionName(autoDetected.sectionUri || '') || <i>None</i>;
  return (
    <Box>
      <Typography>
        <strong>Clip ID:</strong> {autoDetected.clipId || <i>None</i>}
      </Typography>
      <Typography>
        <strong>Section:</strong> {sectionName}
      </Typography>
      <Typography>
        <strong>Slide:</strong> {getSlideTitleFromUri(autoDetected.slideUri)}
      </Typography>
      <Typography>
        <strong>Section Completed:</strong> {autoDetected.sectionCompleted ? '✅' : '⏳'}
      </Typography>
    </Box>
  );
}
