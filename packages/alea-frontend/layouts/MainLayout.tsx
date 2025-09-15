import { useMatomo } from '@jonkoops/matomo-tracker-react';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import { Box, Button, IconButton, Toolbar } from '@mui/material';
import { ReportProblemPopover } from '@alea/report-a-problem';
import { PositionContext } from '@alea/stex-react-renderer';
import { PRIMARY_COL, SECONDARY_COL } from '@alea/utils';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useContext, useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { getLocaleObject } from '../lang/utils';
function SessionResetSlider() {
  const [open, setOpen] = useState(false);

  const handleResetSession = () => {
    const newRecordingId = new Date().toISOString();
    sessionStorage.setItem('recordingId', newRecordingId);
    alert(`New session created with recording ID: ${newRecordingId}`);
    setOpen(false);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        left: open ? 0 : '-20px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'rgba(211, 211, 211, 0.2)',
        p: '5px 5px 5px 15px',
        transition: 'left 0.3s ease',
        zIndex: 2001,
      }}
    >
      <IconButton onClick={() => setOpen(!open)} sx={{ p: 0.5 }}>
        {open ? <ChevronLeft /> : <ChevronRight />}
      </IconButton>

      {open && (
        <Button
          onClick={handleResetSession}
          sx={{
            bgcolor: 'red',
            color: 'white',
            borderRadius: '4px',
            '&:hover': { bgcolor: 'darkred' },
          }}
        >
          Reset Session
        </Button>
      )}
    </Box>
  );
}
const RecordingComponent = () => {
  const { isRecording, setIsRecording } = useContext(PositionContext);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setBlink((prev) => !prev);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setBlink(false);
    }
  }, [isRecording]);

  return (
    <>
      {' '}
      <IconButton
        onClick={() => setIsRecording(!isRecording)}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          p: 1,
          bgcolor: 'lightcoral',
          zIndex: 2000,
          borderRadius: '4px',
          '&:hover': {
            bgcolor: '#CD5C5C',
          },
        }}
      >
        <GpsFixedIcon
          sx={{
            color: isRecording ? 'green' : 'inherit',
          }}
        />
        {isRecording && (
          <FiberManualRecordIcon
            sx={{
              color: blink ? 'red' : 'white',
              ml: 1,
            }}
          />
        )}
      </IconButton>
      <IconButton
        sx={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          p: 1,
          bgcolor: 'lightcoral',
          zIndex: 2000,
          borderRadius: '4px',
        }}
      >
        <GpsFixedIcon
          sx={{
            color: isRecording ? 'green' : 'inherit',
          }}
        />
      </IconButton>
      <SessionResetSlider />
    </>
  );
};

export default function MainLayout({
  title,
  children,
  bgColor,
}: {
  title?: string;
  children: any;
  bgColor?: string;
}) {
  const { trackPageView } = useMatomo();
  const router = useRouter();
  const { header: t } = getLocaleObject(router);
  const [prevLoc, setPrevLoc] = useState('');
  const [conceptTracking, setConceptTracking] = useState(false);

  useEffect(() => {
    const loc = router.asPath;
    if (!router.isReady || prevLoc === loc) return;
    trackPageView();
    setPrevLoc(loc);
  }, [router.isReady, router.asPath]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const conceptTrackingMode = localStorage.getItem('concept-tracking') === 'true';
      setConceptTracking(conceptTrackingMode);
    }
  }, []);

  return (
    <Box minHeight="100vh" display="flex" flexDirection="column" bgcolor={bgColor}>
      <Head>
        <title>{title || 'ALeA'}</title>
        <meta name="description" content="VoLL-KI" />
        <link
          rel="icon"
          href="https://www.voll-ki.fau.de/wp-content/themes/FAU-Einrichtungen/img/socialmedia/favicon.ico"
        />
      </Head>

      <main style={{ flexGrow: 1 }}>
        <Header />
        <ReportProblemPopover />
        {/*<Typography
          sx={{ color: 'red', fontWeight: 'bold', textAlign: 'center' }}
        >
          Unfortunately, the login facility of website is not working. We are
          working to get it resolved and apologize for the inconvenience.
        </Typography>*/}
        <Box>{children}</Box>
        {conceptTracking && <RecordingComponent />}
      </main>
      <footer id="footer">
        <Toolbar
          variant="dense"
          sx={{
            mt: '10px',
            background: PRIMARY_COL,
            color: SECONDARY_COL,
            display: 'flex',
            flexDirection: 'row-reverse',
            fontFamily: '"Roboto"',
            zIndex: 1,
          }}
        >
          <Link href="/privacy">{t.privacyPolicy}</Link>
          <a
            target="_blank"
            rel="noreferrer"
            href="https://www.voll-ki.fau.de/impressum"
            style={{ marginRight: '20px' }}
          >
            {t.legalNotice}
          </a>
        </Toolbar>
      </footer>
    </Box>
  );
}
