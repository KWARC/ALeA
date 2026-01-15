/* eslint-disable @nx/enforce-module-boundaries */
import { MathJaxContext } from '@alea/mathjax';
import { PositionProvider, ServerLinksContext, FTMLReadyContext } from '@alea/stex-react-renderer';
// import { PRIMARY_COL, SECONDARY_COL } from '@alea/utils';
import { initialize } from '@flexiformal/ftml-react';
import { createInstance, MatomoProvider } from '@jonkoops/matomo-tracker-react';
// import { createTheme, ThemeProvider } from '@mui/material/styles';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from '../theme';
import dynamic from 'next/dynamic';
import Box from '@mui/material/Box';
import { AppProps } from 'next/app';
import { CommentRefreshProvider } from '@alea/react-utils';
import { useEffect, useState, useMemo } from 'react';
import { CurrentTermProvider } from '../contexts/CurrentTermContext';
import { ColorModeContext } from '../contexts/ColorModeContext';
import './styles.scss';

const instance = createInstance({
  urlBase: 'https://matomo.kwarc.info',
  siteId: 1,
  // userId: 'UID76903202', optional, default value: `undefined`.
  // trackerUrl: 'https://matomo.kwarc.info/index.php',// optional, default value: `${urlBase}matomo.php`
  // srcUrl: 'https://matomo.kwarc.info/tracking.js', optional, default value: `${urlBase}matomo.js`
  disabled: false, // optional, false by default. Makes all tracking calls no-ops if set to true.
  // heartBeat: {
  // optional, enabled by default
  // active: true, optional, default value: true
  // seconds: 10, optional, default value: `15
  //},
  // linkTracking: false, optional, default value: true
  configurations: {
    // optional, default value: {}
    // any valid matomo configuration, all below are optional
    disableCookies: true,
    setSecureCookie: true,
    setRequestMethod: 'POST',
  },
});

// const theme = createTheme({
//   breakpoints: {
//     values: {
//       xs: 0,
//       sm: 450,
//       md: 800,
//       lg: 1200,
//       xl: 1536,
//     },
//   },
//   palette: {
//     primary: {
//       main: PRIMARY_COL,
//     },
//     secondary: {
//       main: SECONDARY_COL,
//     },
//   },
// });

let flamsInitialized = false;
const initStartTime = Date.now();

initialize(process.env.NEXT_PUBLIC_FLAMS_URL, 'WARN')
  .then(() => {
    console.log('FTML initialized: ', Date.now() - initStartTime, 'ms');
    flamsInitialized = true;
  })
  .catch((err) => {
    console.error(`FTML initialization failed: [${process.env.NEXT_PUBLIC_FLAMS_URL}]`, err);
  });

const ReportProblemPopover = dynamic(
  () => import('@alea/report-a-problem').then((mod) => mod.ReportProblemPopover),
  { ssr: false }
);

function CustomApp({ Component, pageProps }: AppProps) {
  const [readyToRender, setReadyToRender] = useState(flamsInitialized);
  // State to manage the current mode
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  // Provide the toggle function to the context
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setMode(newMode);
        localStorage.setItem('colorMode', newMode);
      },
      mode: mode,
    }),
    [mode]
  );

  useEffect(() => {
    const savedMode = localStorage.getItem('colorMode') as 'light' | 'dark';
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  // Generate the theme based on the current mode
  const theme = useMemo(() => getTheme(mode), [mode]);

  useEffect(() => {
    if (readyToRender) return;

    const interval = setInterval(() => {
      if (flamsInitialized) {
        setReadyToRender(true);
        clearInterval(interval);
      }
    }, 10);

    return () => {
      clearInterval(interval);
    };
  }, [readyToRender]);

  useEffect(() => {
    const currentBuildId = process.env.NEXT_PUBLIC_BUILD_ID;
    const pollBuildId = setInterval(async () => {
      try {
        const res = await fetch('/api/build-id');
        const { buildId: latestBuildId } = await res.json();

        if (currentBuildId && latestBuildId !== currentBuildId) {
          alert(`Refreshing to switch to a newer version of the application`);
          window.location.reload();
        }
      } catch (error) {
        console.debug('Build ID check failed:', error);
      }
    }, 60000);

    return () => {
      clearInterval(pollBuildId);
    };
  }, []);

  return (
    <CommentRefreshProvider>
      <ServerLinksContext.Provider value={{ gptUrl: process.env.NEXT_PUBLIC_GPT_URL }}>
        <MatomoProvider value={instance}>
          <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <MathJaxContext>
                <FTMLReadyContext.Provider value={readyToRender}>
                  <PositionProvider>
                    <CurrentTermProvider>
                      <Box
                        sx={{
                          width: '100vw',
                          height: '100vh',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          bgcolor: 'background.default', // Ensure background follows theme
                          color: 'text.primary', // Ensure text color follows theme
                        }}
                      >
                        <Component {...pageProps} />
                      </Box>
                    </CurrentTermProvider>
                  </PositionProvider>
                </FTMLReadyContext.Provider>
              </MathJaxContext>
              <ReportProblemPopover />
            </ThemeProvider>
          </ColorModeContext.Provider>
        </MatomoProvider>
      </ServerLinksContext.Provider>
    </CommentRefreshProvider>
  );
}

export default CustomApp;
