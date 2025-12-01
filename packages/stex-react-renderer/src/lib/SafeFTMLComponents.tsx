import { FTMLDocument, FTMLFragment, FTMLSetup } from '@flexiformal/ftml-react';
import { CircularProgress } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { getFlamsInitialized } from './helper/ftml-init';


function useFTMLReady(): boolean {
  const [isReady, setIsReady] = useState(getFlamsInitialized());

  useEffect(() => {
    if (isReady) return;

    const interval = setInterval(() => {
      if (getFlamsInitialized()) {
        setIsReady(true);
        clearInterval(interval);
      }
    }, 10);

    return () => {
      clearInterval(interval);
    };
  }, [isReady]);

  return isReady;
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
    <FTMLSetup allowFullscreen={false}>
      <FTMLFragment {...props} allowHovers={props.allowHovers ?? true} />
    </FTMLSetup>
  );
}

export function SafeFTMLDocument(props: React.ComponentProps<typeof FTMLDocument>) {
  const isReady = useFTMLReady();

  if (!isReady) {
    return <CircularProgress />;
  }

  return (
    <FTMLSetup allowFullscreen={false}>
      <FTMLDocument {...props} />
    </FTMLSetup>
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

