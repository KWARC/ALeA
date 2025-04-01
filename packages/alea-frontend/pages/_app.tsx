import { createInstance, MatomoProvider } from '@jonkoops/matomo-tracker-react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { MathJaxContext } from '@stex-react/mathjax';
import { PositionProvider, ServerLinksContext } from '@stex-react/stex-react-renderer';
import { PRIMARY_COL, SECONDARY_COL } from '@stex-react/utils';
import { AppProps } from 'next/app';
import './styles.scss';
import { setDebugLog, setServerUrl } from '@stex-react/ftml-utils';

setDebugLog();
setServerUrl('https://mmt.beta.vollki.kwarc.info');

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

const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 450,
      md: 800,
      lg: 1200,
      xl: 1536,
    },
  },
  palette: {
    primary: {
      main: PRIMARY_COL,
    },
    secondary: {
      main: SECONDARY_COL,
    },
  },
});

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <ServerLinksContext.Provider
      value={{
        mmtUrl: process.env.NEXT_PUBLIC_MMT_URL,
        gptUrl: process.env.NEXT_PUBLIC_GPT_URL,
      }}
    >
      <MatomoProvider value={instance}>
        <ThemeProvider theme={theme}>
          <MathJaxContext>
            <PositionProvider>
              <Component {...pageProps} />
            </PositionProvider>
          </MathJaxContext>
        </ThemeProvider>
      </MatomoProvider>
    </ServerLinksContext.Provider>
  );
}

export default CustomApp;
