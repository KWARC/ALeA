// /* eslint-disable @nx/enforce-module-boundaries */
// import { MathJaxContext } from '@alea/mathjax';
// import { PositionProvider, ServerLinksContext, FTMLReadyContext } from '@alea/stex-react-renderer';
// // import { PRIMARY_COL, SECONDARY_COL } from '@alea/utils';
// import { initialize } from '@flexiformal/ftml-react';
// import { createInstance, MatomoProvider } from '@jonkoops/matomo-tracker-react';
// // import { createTheme, ThemeProvider } from '@mui/material/styles';
// import { ThemeProvider, CssBaseline, GlobalStyles } from '@mui/material';
// import { getTheme } from '../theme';
// import dynamic from 'next/dynamic';
// import Box from '@mui/material/Box';
// import { AppProps } from 'next/app';
// import { CommentRefreshProvider } from '@alea/react-utils';
// import { useEffect, useState, useMemo } from 'react';
// import { CurrentTermProvider } from '../contexts/CurrentTermContext';
// import { ColorModeContext } from '../contexts/ColorModeContext';
// import './styles.scss';

// const instance = createInstance({
//   urlBase: 'https://matomo.kwarc.info',
//   siteId: 1,
//   // userId: 'UID76903202', optional, default value: `undefined`.
//   // trackerUrl: 'https://matomo.kwarc.info/index.php',// optional, default value: `${urlBase}matomo.php`
//   // srcUrl: 'https://matomo.kwarc.info/tracking.js', optional, default value: `${urlBase}matomo.js`
//   disabled: false, // optional, false by default. Makes all tracking calls no-ops if set to true.
//   // heartBeat: {
//   // optional, enabled by default
//   // active: true, optional, default value: true
//   // seconds: 10, optional, default value: `15
//   //},
//   // linkTracking: false, optional, default value: true
//   configurations: {
//     // optional, default value: {}
//     // any valid matomo configuration, all below are optional
//     disableCookies: true,
//     setSecureCookie: true,
//     setRequestMethod: 'POST',
//   },
// });

// // const theme = createTheme({
// //   breakpoints: {
// //     values: {
// //       xs: 0,
// //       sm: 450,
// //       md: 800,
// //       lg: 1200,
// //       xl: 1536,
// //     },
// //   },
// //   palette: {
// //     primary: {
// //       main: PRIMARY_COL,
// //     },
// //     secondary: {
// //       main: SECONDARY_COL,
// //     },
// //   },
// // });

// let flamsInitialized = false;
// const initStartTime = Date.now();

// initialize(process.env.NEXT_PUBLIC_FLAMS_URL, 'WARN')
//   .then(() => {
//     console.log('FTML initialized: ', Date.now() - initStartTime, 'ms');
//     flamsInitialized = true;
//   })
//   .catch((err) => {
//     console.error(`FTML initialization failed: [${process.env.NEXT_PUBLIC_FLAMS_URL}]`, err);
//   });

// function CustomApp({ Component, pageProps }: AppProps) {
//   const [readyToRender, setReadyToRender] = useState(flamsInitialized);
//   const [mode, setMode] = useState<'light' | 'dark' | 'system'>('system');

//   // Helper to determine the actual theme to use
//   const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light');

//   useEffect(() => {
//     const savedMode = localStorage.getItem('colorMode') as 'light' | 'dark' | 'system';
//     if (savedMode) {
//       setMode(savedMode);
//     }
//   }, []);

//   useEffect(() => {
//     if (mode === 'system') {
//       const matchMedia = window.matchMedia('(prefers-color-scheme: dark)');
//       const handleChange = (e: MediaQueryListEvent) => {
//         setResolvedMode(e.matches ? 'dark' : 'light');
//       };

//       setResolvedMode(matchMedia.matches ? 'dark' : 'light');
//       matchMedia.addEventListener('change', handleChange);
//       return () => matchMedia.removeEventListener('change', handleChange);
//     } else {
//       setResolvedMode(mode);
//     }
//   }, [mode]);

//   // Provide the functions to the context
//   const colorMode = useMemo(
//     () => ({
//       toggleColorMode: () => {
//         const nextMode = {
//           system: 'dark',
//           dark: 'light',
//           light: 'system',
//         }[mode] as 'light' | 'dark' | 'system';

//         setMode(nextMode);
//         localStorage.setItem('colorMode', nextMode);
//       },
//       setMode: (targetMode: 'light' | 'dark' | 'system') => {
//         setMode(targetMode);
//         localStorage.setItem('colorMode', targetMode);
//       },
//       mode: mode,
//     }),
//     [mode, resolvedMode]
//   );

//   // Generate the theme based on the resolved mode
//   const theme = useMemo(() => getTheme(resolvedMode), [resolvedMode]);

//   useEffect(() => {
//     if (readyToRender) return;

//     const interval = setInterval(() => {
//       if (flamsInitialized) {
//         setReadyToRender(true);
//         clearInterval(interval);
//       }
//     }, 10);

//     return () => {
//       clearInterval(interval);
//     };
//   }, [readyToRender]);

//   useEffect(() => {
//     const currentBuildId = process.env.NEXT_PUBLIC_BUILD_ID;
//     const pollBuildId = setInterval(async () => {
//       try {
//         const res = await fetch('/api/build-id');
//         const { buildId: latestBuildId } = await res.json();

//         if (currentBuildId && latestBuildId !== currentBuildId) {
//           alert(`Refreshing to switch to a newer version of the application`);
//           window.location.reload();
//         }
//       } catch (error) {
//         console.debug('Build ID check failed:', error);
//       }
//     }, 60000);

//     return () => {
//       clearInterval(pollBuildId);
//     };
//   }, []);

//   return (
//     <CommentRefreshProvider>
//       <ServerLinksContext.Provider value={{ gptUrl: process.env.NEXT_PUBLIC_GPT_URL }}>
//         <MatomoProvider value={instance}>
//           <ColorModeContext.Provider value={colorMode}>
//             <ThemeProvider theme={theme}>
//               <CssBaseline />
//               <GlobalStyles
//                 styles={(theme) => ({
//                   '.stex-document, .ftml-document, .omdoc-content': {
//                     backgroundColor: 'transparent !important',
//                   },
//                   'html, body': {
//                     backgroundColor: `${theme.palette.background.default} !important`,
//                   },
//                   '.term, .definition, .concept, [class*="term"], [class*="definition"], [class*="concept"]': {
//                     backgroundColor: 'transparent !important',
//                     color:
//                       theme.palette.mode === 'dark'
//                         ? '#60a5fa !important'
//                         : `${theme.palette.primary.main} !important`,
//                     textDecoration: 'underline !important',
//                   },
//                 })}
//               />
//               <MathJaxContext>
//                 <FTMLReadyContext.Provider value={readyToRender}>
//                   <PositionProvider>
//                     <CurrentTermProvider>
//                       <Box
//                         sx={{
//                           width: '100vw',
//                           height: '100vh',
//                           overflowY: 'auto',
//                           overflowX: 'hidden',
//                           bgcolor: 'background.default', // Ensure background follows theme
//                           color: 'text.primary', // Ensure text color follows theme
//                         }}
//                       >
//                         <Component {...pageProps} />
//                       </Box>
//                     </CurrentTermProvider>
//                   </PositionProvider>
//                 </FTMLReadyContext.Provider>
//               </MathJaxContext>
//               <ReportProblemPopover />
//             </ThemeProvider>
//           </ColorModeContext.Provider>
//         </MatomoProvider>
//       </ServerLinksContext.Provider>
//     </CommentRefreshProvider>
//   );
// }

// export default CustomApp;
