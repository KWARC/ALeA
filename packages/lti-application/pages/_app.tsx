import { AppProps } from 'next/app';
import Head from 'next/head';
import { CssBaseline } from '@mui/material';
import { FTMLReadyContext } from '@alea/stex-react-renderer';
import { initialize } from '@flexiformal/ftml-react';
import { useEffect, useState } from 'react';
import './styles.css';

const flamsUrl = process.env.NEXT_PUBLIC_FLAMS_URL || 'https://mathhub.info';
let ftmlInitialized = false;

initialize(flamsUrl, 'WARN')
  .then(() => {
    ftmlInitialized = true;
  })
  .catch((err) => {
    console.error(`FTML initialization failed: [${flamsUrl}]`, err);
  });

function CustomApp({ Component, pageProps }: AppProps) {
  const [readyToRender, setReadyToRender] = useState(ftmlInitialized);

  useEffect(() => {
    if (readyToRender) return;

    const interval = setInterval(() => {
      if (ftmlInitialized) {
        setReadyToRender(true);
        clearInterval(interval);
      }
    }, 10);

    return () => {
      clearInterval(interval);
    };
  }, [readyToRender]);

  return (
    <>
      <Head>
        <title>ALeA Study Buddy LTI</title>
      </Head>
      <CssBaseline />
      <main className="app">
        <FTMLReadyContext.Provider value={readyToRender}>
          <Component {...pageProps} />
        </FTMLReadyContext.Provider>
      </main>
    </>
  );
}

export default CustomApp;
