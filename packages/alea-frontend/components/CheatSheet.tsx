import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PrintIcon from '@mui/icons-material/Print';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface CheatSheetProps {
  userId: string;
  userEmail: string;
  firstName: string;
  lastName: string;
  courseId: string;
  courseName: string;
  examDate?: string;
}

interface QrImageProps {
  data: string;
  size?: number;
  alt?: string;
}

function buildQrPayload(props: CheatSheetProps, nonce: string) {
  return JSON.stringify({
    uid: props.userId,
    email: props.userEmail,
    course: props.courseId,
    nonce,
    ts: new Date().toISOString(),
  });
}

function useNonce() {
  const [nonce] = useState(
    () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  );
  return nonce;
}

function QrImage({ data, size = 96, alt = 'QR code' }: QrImageProps) {
  const { data: src } = useQuery({
    queryKey: ['qr-dataurl', data, size],
    queryFn: () =>
      QRCode.toDataURL(data, {
        width: size,
        margin: 2,
        color: { dark: '#1a1a2e', light: '#ffffff' },
      }),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (!src) {
    return <Box sx={{ ...qrImageStyles.placeholder, width: size, height: size }}>QR…</Box>;
  }

  return (
    <Box component="img" src={src} alt={alt} sx={{ display: 'block', width: size, height: size }} />
  );
}

function DotCorner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  return (
    <Box
      sx={[
        dotCornerStyles.base,
        position === 'tl' && dotCornerStyles.tl,
        position === 'tr' && dotCornerStyles.tr,
        position === 'bl' && dotCornerStyles.bl,
        position === 'br' && dotCornerStyles.br,
      ]}
    />
  );
}

const MicroDotBg = () => <Box sx={microDotBgStyles.root} />;

function Watermark({ text }: { text: string }) {
  return (
    <Box sx={watermarkStyles.root}>
      <Typography sx={watermarkStyles.text}>
        {text} &nbsp;&nbsp; {text} &nbsp;&nbsp; {text}
      </Typography>
    </Box>
  );
}

export function CheatSheetDocument(props: CheatSheetProps) {
  const { userId, userEmail, firstName, lastName, courseId, courseName, examDate } = props;
  const nonce = useNonce();
  const qrPayload = buildQrPayload(props, nonce);
  const displayName = `${firstName} ${lastName}`;
  const watermarkText = `${displayName} · ${userEmail}`;
  const theme = useTheme();

  return (
    <Box id="cheatsheet-print-area" sx={{ ...documentStyles.root, boxShadow: theme.shadows[4] }}>
      <Box sx={documentStyles.header}>
        <Box sx={documentStyles.headerInfo}>
          <Typography variant="h6">{courseId.toUpperCase()} · Cheat Sheet</Typography>
          <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
            {courseName}
          </Typography>
          {examDate && (
            <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
              Exam: {examDate}
            </Typography>
          )}
          <Typography variant="subtitle1" sx={{ mt: 0.25 }}>
            <b>Name:</b> {displayName}
          </Typography>
          <Typography variant="subtitle1">
            <b>ID:</b> {userId}
          </Typography>
          <Typography variant="subtitle1">
            <b>Email:</b> {userEmail}
          </Typography>
        </Box>
        <Box sx={documentStyles.headerQr}>
          <QrImage data={qrPayload} size={100} alt="verification QR" />
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            Scan to verify
          </Typography>
        </Box>
      </Box>
      <Box sx={documentStyles.writingArea}>
        <MicroDotBg />
        <Watermark text={watermarkText} />
        <DotCorner position="tl" />
        <DotCorner position="tr" />
        <DotCorner position="bl" />
        <DotCorner position="br" />
        <Box sx={documentStyles.writingInner} />
      </Box>
      <Box sx={documentStyles.footer}>
        <Box sx={documentStyles.footerQr}>
          <QrImage data={qrPayload} size={72} alt="verification QR" />
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            Nonce: {nonce}
          </Typography>
        </Box>
        <Typography variant="subtitle2" sx={{ color: 'text.disabled', textAlign: 'right' }}>
          This document is uniquely identified and tamper-evident.
          <br />
          Any reproduction or alteration voids authenticity.
        </Typography>
      </Box>
    </Box>
  );
}

function CheatSheetViewerDialog({
  open,
  onClose,
  sheetProps,
}: {
  open: boolean;
  onClose: () => void;
  sheetProps: CheatSheetProps;
}) {
  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={dialogStyles.title}>
        Cheat Sheet Preview
        <Box>
          <Tooltip title="Print / Save as PDF">
            <IconButton onClick={handlePrint} sx={dialogStyles.iconButton}>
              <PrintIcon />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose} sx={dialogStyles.iconButton}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={dialogStyles.content}>
        <Box sx={dialogStyles.scaleWrapper}>
          <CheatSheetDocument {...sheetProps} />
        </Box>
      </DialogContent>
    </Dialog>
  );
}

async function downloadAsPdf(sheetProps: CheatSheetProps) {
  const el = document.getElementById('cheatsheet-print-area');
  if (!el) {
    console.error('cheatsheet-print-area not found in DOM');
    return;
  }
  const scaleWrapper = el.closest('[style*="scale"]') as HTMLElement | null;
  const originalTransform = scaleWrapper?.style.transform;
  if (scaleWrapper) scaleWrapper.style.transform = 'none';
  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`CheatSheet_${sheetProps.courseId}_${sheetProps.userId}.pdf`);
  } finally {
    if (scaleWrapper && originalTransform !== undefined) {
      scaleWrapper.style.transform = originalTransform ?? '';
    }
  }
}

export function CheatSheetActions({ sheetProps }: { sheetProps: CheatSheetProps }) {
  const [viewOpen, setViewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!viewOpen) setViewOpen(true);
    await new Promise((r) => setTimeout(r, 400));
    setDownloading(true);
    try {
      await downloadAsPdf(sheetProps);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Box sx={actionsStyles.root}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<VisibilityIcon />}
          onClick={() => setViewOpen(true)}
          sx={actionsStyles.viewButton}
        >
          View Cheat Sheet
        </Button>

        <Button
          variant="contained"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          disabled={downloading}
          sx={actionsStyles.downloadButton}
        >
          {downloading ? 'Generating PDF…' : 'Download PDF'}
        </Button>
      </Box>

      <CheatSheetViewerDialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        sheetProps={sheetProps}
      />
    </>
  );
}

const documentStyles = {
  root: {
    width: '210mm',
    minHeight: '297mm',
    bgcolor: 'background.default',
    fontFamily: '"Courier Prime", monospace',
    color: 'text.primary',
    position: 'relative',
    mx: 'auto',
    '@media print': {
      boxShadow: 'none',
      width: '100%',
      minHeight: '100vh',
    },
  },
  header: {
    borderBottom: '2px dashed',
    borderColor: 'text.primary',
    p: '10px 14px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'linear-gradient(90deg,#f0f4ff 0%,#fff 100%)',
    position: 'relative',
    zIndex: 2,
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.25,
  },
  headerQr: {
    textAlign: 'center',
  },
  writingArea: {
    position: 'relative',
    mx: 1.75,
    my: 1.25,
    border: '1.5px solid',
    borderColor: 'text.primary',
    minHeight: '218mm',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  writingInner: {
    position: 'relative',
    zIndex: 2,
    p: '10px 12px',
    backgroundImage:
      'repeating-linear-gradient(transparent, transparent 23px, rgba(0,0,100,0.07) 23px, rgba(0,0,100,0.07) 24px)',
    minHeight: '218mm',
  },
  footer: {
    borderTop: '2px dashed',
    borderColor: 'text.primary',
    p: 1,
    px: 1.75,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerQr: {
    textAlign: 'center',
  },
};

const dotCornerStyles = {
  base: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderStyle: 'solid',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  tl: { top: 0, left: 0, borderTopColor: 'text.primary', borderLeftColor: 'text.primary' },
  tr: { top: 0, right: 0, borderTopColor: 'text.primary', borderRightColor: 'text.primary' },
  bl: { bottom: 0, left: 0, borderBottomColor: 'text.primary', borderLeftColor: 'text.primary' },
  br: { bottom: 0, right: 0, borderBottomColor: 'text.primary', borderRightColor: 'text.primary' },
};

const microDotBgStyles = {
  root: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.10) 1px, transparent 1px)',
    backgroundSize: '8px 8px',
    zIndex: 0,
  },
};

const watermarkStyles = {
  root: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    overflow: 'hidden',
    zIndex: 1,
  },
  text: {
    transform: 'rotate(-35deg)',
    fontFamily: '"Courier Prime", monospace',
    fontWeight: 700,
    color: 'rgba(0,0,0,0.055)',
    whiteSpace: 'nowrap',
    letterSpacing: '2px',
    userSelect: 'none',
    textTransform: 'uppercase',
    fontSize: '22px',
  },
};

const qrImageStyles = {
  placeholder: {
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: 'divider',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'text.disabled',
  },
};

const dialogStyles = {
  title: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    fontFamily: '"Courier Prime", monospace',
  },
  iconButton: {
    color: 'primary.contrastText',
    mr: 1,
  },
  content: {
    bgcolor: 'background.paper',
    p: 3,
    overflowX: 'auto',
  },
  scaleWrapper: {
    transform: 'scale(0.72)',
    transformOrigin: 'top center',
    mb: '-80px',
  },
};

const actionsStyles = {
  root: {
    display: 'flex',
    gap: 1,
    alignItems: 'center',
    mt: 1,
  },
  viewButton: {
    borderColor: 'primary.main',
    color: 'primary.main',
    fontFamily: '"Courier Prime", monospace',
    textTransform: 'none',
    '&:hover': { bgcolor: 'primary.50' },
  },
  downloadButton: {
    bgcolor: 'primary.main',
    fontFamily: '"Courier Prime", monospace',
    textTransform: 'none',
    '&:hover': { bgcolor: 'primary.600' },
  },
};
