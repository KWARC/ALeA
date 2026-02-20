import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PrintIcon from '@mui/icons-material/Print';
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

interface QrImageProps {
  data: string;
  size?: number;
  alt?: string;
}

function QrImage({ data, size = 96, alt = 'QR code' }: QrImageProps) {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(data, {
      width: size,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    })
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(console.error);
    return () => { cancelled = true; };
  }, [data, size]);

  if (!src) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          background: '#eee',
          border: '1px solid #ccc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
          color: '#999',
        }}
      >
        QR…
      </Box>
    );
  }
  return <img src={src} alt={alt} width={size} height={size} style={{ display: 'block' }} />;
}

function DotCorner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const corners: Record<string, React.CSSProperties> = {
    tl: { top: 0, left: 0, borderTopColor: '#1a1a2e', borderLeftColor: '#1a1a2e' },
    tr: { top: 0, right: 0, borderTopColor: '#1a1a2e', borderRightColor: '#1a1a2e' },
    bl: { bottom: 0, left: 0, borderBottomColor: '#1a1a2e', borderLeftColor: '#1a1a2e' },
    br: { bottom: 0, right: 0, borderBottomColor: '#1a1a2e', borderRightColor: '#1a1a2e' },
  };
  return (
    <Box
      sx={{
        position: 'absolute',
        width: 18,
        height: 18,
        borderStyle: 'solid',
        borderWidth: 3,
        borderColor: 'transparent',
        ...corners[position],
      }}
    />
  );
}

const MicroDotBg = () => (
  <Box
    sx={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.10) 1px, transparent 1px)',
      backgroundSize: '8px 8px',
      zIndex: 0,
    }}
  />
);

function Watermark({ text }: { text: string }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      <Typography
        sx={{
          transform: 'rotate(-35deg)',
          fontSize: '22px',
          fontFamily: '"Courier Prime", monospace',
          fontWeight: 700,
          color: 'rgba(0,0,0,0.055)',
          whiteSpace: 'nowrap',
          letterSpacing: '2px',
          userSelect: 'none',
          textTransform: 'uppercase',
        }}
      >
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

  return (
    <Box
      id="cheatsheet-print-area"
      sx={{
        width: '210mm',
        minHeight: '297mm',
        background: '#fff',
        fontFamily: '"Courier Prime", monospace',
        fontSize: '11px',
        color: '#1a1a2e',
        position: 'relative',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        mx: 'auto',
        '@media print': {
          boxShadow: 'none',
          width: '100%',
          minHeight: '100vh',
        },
      }}
    >
      <Box
        sx={{
          borderBottom: '2px dashed #1a1a2e',
          p: '10px 14px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg,#f0f4ff 0%,#fff 100%)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 800, letterSpacing: 1 }}>
            {courseId.toUpperCase()} · Cheat Sheet
          </Typography>
          <Typography sx={{ fontSize: '10px', color: '#555' }}>{courseName}</Typography>
          {examDate && (
            <Typography sx={{ fontSize: '10px', color: '#555' }}>Exam: {examDate}</Typography>
          )}
          <Typography sx={{ fontSize: '10px', mt: '2px' }}>
            <b>Name:</b> {displayName}
          </Typography>
          <Typography sx={{ fontSize: '10px' }}>
            <b>ID:</b> {userId}
          </Typography>
          <Typography sx={{ fontSize: '10px' }}>
            <b>Email:</b> {userEmail}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <QrImage data={qrPayload} size={100} alt="verification QR" />
          <Typography sx={{ fontSize: '8px', color: '#777', mt: '2px' }}>
            Scan to verify
          </Typography>
        </Box>
      </Box>
      <Box
        sx={{
          position: 'relative',
          mx: '14px',
          my: '10px',
          border: '1.5px solid #1a1a2e',
          minHeight: '218mm',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <MicroDotBg />
        <Watermark text={watermarkText} />
        <DotCorner position="tl" />
        <DotCorner position="tr" />
        <DotCorner position="bl" />
        <DotCorner position="br" />
        <Box
          sx={{
            position: 'relative',
            zIndex: 2,
            p: '10px 12px',
            backgroundImage:
              'repeating-linear-gradient(transparent, transparent 23px, rgba(0,0,100,0.07) 23px, rgba(0,0,100,0.07) 24px)',
            minHeight: '218mm',
          }}
        />
      </Box>
      <Box
        sx={{
          borderTop: '2px dashed #1a1a2e',
          p: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <QrImage data={qrPayload} size={72} alt="verification QR" />
          <Typography sx={{ fontSize: '8px', color: '#777', mt: '2px' }}>
            Nonce: {nonce}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '9px', color: '#aaa', textAlign: 'right' }}>
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
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#1a1a2e',
          color: '#fff',
          fontFamily: '"Courier Prime", monospace',
        }}
      >
        Cheat Sheet Preview
        <Box>
          <Tooltip title="Print / Save as PDF">
            <IconButton onClick={handlePrint} sx={{ color: '#fff', mr: 1 }}>
              <PrintIcon />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ background: '#e8eaf0', p: '24px', overflowX: 'auto' }}>
        <Box sx={{ transform: 'scale(0.72)', transformOrigin: 'top center', mb: '-80px' }}>
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

  const originalTransform = (el.closest('[style*="scale"]') as HTMLElement | null)?.style.transform;
  const scaleWrapper = el.closest('[style*="scale"]') as HTMLElement | null;
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
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<VisibilityIcon />}
          onClick={() => setViewOpen(true)}
          sx={{
            borderColor: '#1a1a2e',
            color: '#1a1a2e',
            fontFamily: '"Courier Prime", monospace',
            textTransform: 'none',
            '&:hover': { background: '#f0f4ff' },
          }}
        >
          View Cheat Sheet
        </Button>

        <Button
          variant="contained"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          disabled={downloading}
          sx={{
            background: '#1a1a2e',
            fontFamily: '"Courier Prime", monospace',
            textTransform: 'none',
            '&:hover': { background: '#2d2d5e' },
          }}
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