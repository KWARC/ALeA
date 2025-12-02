import { FTMLDocument, FTMLFragment, FTMLSetup } from '@flexiformal/ftml-react';
import { CircularProgress } from '@mui/material';
import React, { useContext } from 'react';
import { FTMLReadyContext } from './stex-react-renderer';

function useFTMLReady(): boolean {
  return useContext(FTMLReadyContext);
}

export function SafeFTMLFragment(
  props: React.ComponentProps<typeof FTMLFragment> & {
    allowHovers?: boolean;
  }
) {
  const isReady = useFTMLReady();

  if (!isReady) {
    return <CircularProgress />;
  }

  return (
      <FTMLFragment {...props} />
  );
}

export function SafeFTMLDocument(props: React.ComponentProps<typeof FTMLDocument>) {
  const isReady = useFTMLReady();

  if (!isReady) {
    return <CircularProgress />;
  }

  return (
      <FTMLDocument {...props} />
  );
}


export function SafeFTMLSetup(
  props: React.ComponentProps<typeof FTMLSetup> & {
    allowFullscreen?: boolean;
    children: React.ReactNode;
  }
) {
  const isReady = useFTMLReady();

  if (!isReady) {
    return <CircularProgress />;
  }

  return <FTMLSetup {...props} allowFullscreen={props.allowFullscreen ?? false} />;
}

