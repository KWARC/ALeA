import { MathJaxContext } from '@alea/mathjax';
import { PositionProvider, ServerLinksContext, FTMLReadyContext } from '@alea/stex-react-renderer';
import { initialize } from '@flexiformal/ftml-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createInstance, MatomoProvider } from '@jonkoops/matomo-tracker-react';
import { ThemeProvider } from '@mui/material';
import { getTheme } from '../theme';
import { AppProps } from 'next/app';
import { UserContextProvider, CommentRefreshProvider, IsLoggedInProvider } from '@alea/react-utils';
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

const queryClient = new QueryClient();

function CustomApp({ Component, pageProps }: AppProps) {
  const [readyToRender, setReadyToRender] = useState(flamsInitialized);
  const [mode, setMode] = useState<'light' | 'dark' | 'system'>('light');
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedMode = localStorage.getItem('colorMode') as 'light' | 'dark' | 'system';
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  useEffect(() => {
    if (mode === 'system') {
      const matchMedia = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setResolvedMode(e.matches ? 'dark' : 'light');
      };

      setResolvedMode(matchMedia.matches ? 'dark' : 'light');
      matchMedia.addEventListener('change', handleChange);
      return () => matchMedia.removeEventListener('change', handleChange);
    } else {
      setResolvedMode(mode);
    }
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        const targetMode = resolvedMode === 'light' ? 'dark' : 'light';
        const systemMode = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';

        if (targetMode === systemMode) {
          setMode('system');
          localStorage.setItem('colorMode', 'system');
        } else {
          setMode(targetMode);
          localStorage.setItem('colorMode', targetMode);
        }
      },
      setMode: (targetMode: 'light' | 'dark' | 'system') => {
        setMode(targetMode);
        localStorage.setItem('colorMode', targetMode);
      },
      mode: mode,
    }),
    [mode, resolvedMode]
  );

  const theme = useMemo(() => getTheme(resolvedMode), [resolvedMode]);

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
      <QueryClientProvider client={queryClient}>
    <CommentRefreshProvider>
      <ServerLinksContext.Provider value={{ gptUrl: process.env.NEXT_PUBLIC_GPT_URL }}>
        <MatomoProvider value={instance}>
          <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
              <MathJaxContext>
                <FTMLReadyContext.Provider value={readyToRender}>
                  <PositionProvider>
                    <UserContextProvider>
                      <IsLoggedInProvider>
                        <CurrentTermProvider>
                          <div
                            style={{
                              width: '100vw',
                              height: '100vh',
                              overflowY: 'auto',
                              overflowX: 'hidden',
                            }}
                          >
                            <Component {...pageProps} />
                          </div>
                        </CurrentTermProvider>
                      </IsLoggedInProvider>
                    </UserContextProvider>
                  </PositionProvider>
                </FTMLReadyContext.Provider>
              </MathJaxContext>
            </ThemeProvider>
          </ColorModeContext.Provider>
        </MatomoProvider>
      </ServerLinksContext.Provider>
    </CommentRefreshProvider>
       { process.env.NEXT_PUBLIC_SITE_VERSION === 'development' && (
      <ReactQueryDevtools initialIsOpen={false} />
    )}
    </QueryClientProvider>
  );
}

export default CustomApp;
