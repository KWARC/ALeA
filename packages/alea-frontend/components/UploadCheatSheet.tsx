import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useRef, useState, DragEvent, ChangeEvent } from 'react';

export interface UploadCheatSheetProps {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
  instanceId: string;
  courseId: string;
  universityId: string;
  userId: string;
  isInstructor?: boolean;
}

function isWithinUploadWindow(): boolean {
  const day = new Date().getDay();
  return day >= 1 || day === 0;
}

const UPLOAD_WINDOW_LABEL = 'Monday 12:00 AM – Sunday 11:59:59 PM';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export function UploadCheatSheet({
  open,
  onClose,
  onUploaded,
  instanceId,
  courseId,
  universityId,
  userId,
  isInstructor = false,
}: UploadCheatSheetProps) {
  const uploadAllowed = isInstructor || isWithinUploadWindow();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [studentName, setStudentName] = useState('');
  const [weekId, setWeekId] = useState('');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function handleClose() {
    if (status === 'uploading') return;
    setFile(null);
    setStudentName('');
    setWeekId('');
    setStatus('idle');
    setErrorMsg('');
    onClose();
  }

  function acceptFile(f: File) {
    if (!f.name.endsWith('.pdf')) {
      setErrorMsg('Only PDF files are accepted.');
      return;
    }
    setErrorMsg('');
    setFile(f);
    setStatus('idle');
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) acceptFile(dropped);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) acceptFile(selected);
    e.target.value = '';
  }

  async function handleUpload() {
    if (!file) return;
    setStatus('uploading');
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/uploadpdf', {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...(isInstructor ? { 'x-is-instructor': 'true' } : {}),
        },
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Upload failed');
      }

      setStatus('success');
      onUploaded();
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.message ?? 'Something went wrong. Please try again.');
    }
  }

  const canUpload = Boolean(file) && status !== 'uploading' && uploadAllowed;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={styles.title}>
        <Box sx={styles.titleInner}>
          <UploadFileIcon fontSize="small" />
          <Typography variant="subtitle1" sx={styles.titleText}>
            Upload Cheat Sheet
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={styles.closeBtn} disabled={status === 'uploading'}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={styles.content}>
        <Box
          sx={{
            ...styles.dropZone,
            ...(dragging ? styles.dropZoneActive : {}),
            ...(file ? styles.dropZoneHasFile : {}),
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {file ? (
            <>
              <CheckCircleOutlineIcon sx={styles.fileIcon} />
              <Typography variant="body2" sx={styles.fileName} noWrap>
                {file.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(file.size / 1024).toFixed(1)} KB · Click to replace
              </Typography>
            </>
          ) : (
            <>
              <UploadFileIcon sx={styles.dropIcon} />
              <Typography variant="body2" fontWeight={500}>
                Drag &amp; drop a PDF here
              </Typography>
              <Typography variant="caption" color="text.secondary">
                or click to browse
              </Typography>
            </>
          )}
        </Box>

        {!isInstructor && !uploadAllowed && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            Uploads are only accepted during the active week ({UPLOAD_WINDOW_LABEL}). The upload
            window is currently closed.
          </Alert>
        )}
        {errorMsg && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {errorMsg}
          </Alert>
        )}
        {status === 'success' && (
          <Alert severity="success" sx={{ mt: 1.5 }}>
            Cheat sheet uploaded successfully!
          </Alert>
        )}
        <Box sx={styles.actions}>
          <Button variant="outlined" onClick={handleClose} disabled={status === 'uploading'}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!canUpload}
            startIcon={
              status === 'uploading' ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <UploadFileIcon />
              )
            }
          >
            {status === 'uploading' ? 'Uploading…' : 'Upload'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

const styles = {
  title: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    py: 1.5,
    px: 2.5,
  },
  titleInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },
  titleText: {
    fontWeight: 600,
  },
  closeBtn: {
    color: 'primary.contrastText',
    '&:hover': { bgcolor: 'primary.600' },
  },
  content: {
    pt: 2.5,
    pb: 3,
    px: 3,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0.75,
    py: 4,
    borderRadius: 2,
    border: '2px dashed',
    borderColor: 'divider',
    bgcolor: 'background.default',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
    '&:hover': {
      borderColor: 'primary.main',
      bgcolor: 'primary.50',
    },
  },
  dropZoneActive: {
    borderColor: 'primary.main',
    bgcolor: 'primary.50',
  },
  dropZoneHasFile: {
    borderStyle: 'solid',
    borderColor: 'success.main',
    bgcolor: 'success.50',
  },
  dropIcon: {
    fontSize: 40,
    color: 'text.disabled',
    mb: 0.5,
  },
  fileIcon: {
    fontSize: 36,
    color: 'success.main',
    mb: 0.5,
  },
  fileName: {
    fontFamily: '"Courier Prime", monospace',
    fontWeight: 600,
    color: 'text.primary',
    maxWidth: '90%',
  },
  fields: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    mt: 2.5,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 1.5,
    mt: 3,
  },
};
