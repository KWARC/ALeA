import { FTMLDocument, FTMLFragment, FTMLSetup } from '@flexiformal/ftml-react';
import { Box, CircularProgress } from '@mui/material';
import React, { useContext } from 'react';
import { FTMLReadyContext } from './stex-react-renderer';

function useFTMLReady(): boolean {
  return useContext(FTMLReadyContext);
}

export function SafeFTMLFragment(props: React.ComponentProps<typeof FTMLFragment>) {
  const isReady = useFTMLReady();

  if (!isReady) {
    return <CircularProgress />;
  }

  return (
    <Box className="ftml-reset">
      <FTMLFragment {...props} />
     </Box>
  );
}

export function SafeFTMLDocument(props: React.ComponentProps<typeof FTMLDocument>) {
  const isReady = useFTMLReady();

  if (!isReady) {
    return <CircularProgress />;
  }

  return (
    <Box className="ftml-reset">
      <FTMLDocument {...props} />
     </Box>
  );
}

export function SafeFTMLSetup(
  props: React.ComponentProps<typeof FTMLSetup> & {
    children: React.ReactNode;
  }
) {
  const isReady = useFTMLReady();

  if (!isReady) {
    return <CircularProgress />;
  }

  return <FTMLSetup {...props} />;
}
