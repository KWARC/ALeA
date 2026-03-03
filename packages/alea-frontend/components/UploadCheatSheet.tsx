import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Alert,
  Tabs,
  Tab,
  Fade,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { postScannedCheatSheet } from '@alea/spec';

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

type UploadTab = 'file' | 'camera' | 'gallery';

interface ImageEntry {
  file: File;
  preview: string;
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [tab, setTab] = useState<UploadTab>('file');
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraPreview, setCameraPreview] = useState<string | null>(null);

  const cameraMutation = useMutation({
    mutationFn: async (facing: 'environment' | 'user') => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCameraReady(false);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
      return stream;
    },
    onSuccess: (stream) => {
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    },
    onError: () => {
      setCameraReady(false);
    },
  });

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    cameraMutation.reset();
  }

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (tab === 'file' && file) {
        const formData = new FormData();
        formData.append('file', file);
        await postScannedCheatSheet(formData);
      } else if (images.length > 0) {
        // Upload all images sequentially
        for (const img of images) {
          const formData = new FormData();
          formData.append('file', img.file);
          await postScannedCheatSheet(formData);
        }
      }
    },
    onSuccess: () => {
      setFile(null);
      setImages([]);
      setCameraPreview(null);
      onUploaded();
    },
    onError: (err: Error) => {
      setErrorMsg(err?.message ?? 'Something went wrong. Please try again.');
    },
  });

  function resetState() {
    setFile(null);
    setImages([]);
    setCameraPreview(null);
    setErrorMsg('');
    setTab('file');
    uploadMutation.reset();
    stopCamera();
  }

  function handleClose() {
    if (uploadMutation.isPending) return;
    resetState();
    onClose();
  }

  function handleTabChange(v: UploadTab) {
    setTab(v);
    setFile(null);
    setImages([]);
    setCameraPreview(null);
    setErrorMsg('');
    uploadMutation.reset();
    if (v === 'camera') {
      cameraMutation.mutate(facingMode);
    } else {
      stopCamera();
    }
  }

  function acceptFile(f: File) {
    if (!f.name.endsWith('.pdf')) {
      setErrorMsg('Only PDF files are accepted.');
      return;
    }
    setErrorMsg('');
    setFile(f);
  }

  function addImageFile(f: File) {
    if (!f.type.startsWith('image/')) {
      setErrorMsg('Only image files are accepted from gallery/camera.');
      return;
    }
    setErrorMsg('');
    const url = URL.createObjectURL(f);
    setImages((prev) => [...prev, { file: f, preview: url }]);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
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

  function handleGalleryChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((f) => addImageFile(f));
    }
    e.target.value = '';
  }

  function handleCapture() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const captured = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        addImageFile(captured);
        // Don't stop camera — allow taking more photos
      },
      'image/jpeg',
      0.92
    );
  }

  function handleFlipCamera() {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    cameraMutation.mutate(next);
  }

  function handleUpload() {
    setErrorMsg('');
    uploadMutation.mutate();
  }

  const hasContent = tab === 'file' ? Boolean(file) : images.length > 0;
  const canUpload = hasContent && !uploadMutation.isPending && uploadAllowed;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: styles.paper }}
    >
      <DialogTitle sx={styles.title}>
        <Box sx={styles.titleInner}>
          <UploadFileIcon fontSize="small" />
          <Typography variant="subtitle1" sx={styles.titleText}>
            Upload Cheat Sheet
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={styles.closeBtn} disabled={uploadMutation.isPending}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={styles.content}>
        <Tabs
          value={tab}
          onChange={(_, v) => handleTabChange(v)}
          sx={styles.tabs}
          variant="fullWidth"
        >
          <Tab
            value="file"
            icon={<InsertDriveFileIcon fontSize="small" />}
            iconPosition="start"
            label="PDF File"
            sx={styles.tab}
          />
          <Tab
            value="camera"
            icon={<CameraAltIcon fontSize="small" />}
            iconPosition="start"
            label="Camera"
            sx={styles.tab}
          />
          <Tab
            value="gallery"
            icon={<PhotoLibraryIcon fontSize="small" />}
            iconPosition="start"
            label="Gallery"
            sx={styles.tab}
          />
        </Tabs>

        {/* ── PDF FILE TAB ── */}
        {tab === 'file' && (
          <Fade in>
            <Box>
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
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                {file ? (
                  <>
                    <CheckCircleOutlineIcon sx={styles.successIcon} />
                    <Typography variant="body2" sx={styles.fileName} noWrap>
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(file.size / 1024).toFixed(1)} KB · Click to replace
                    </Typography>
                  </>
                ) : (
                  <>
                    <Box sx={styles.dropIconWrapper}>
                      <InsertDriveFileIcon sx={styles.dropIcon} />
                    </Box>
                    <Typography variant="body2" fontWeight={600}>
                      Drag &amp; drop your PDF here
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      or click to browse files
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          </Fade>
        )}

        {/* ── CAMERA TAB ── */}
        {tab === 'camera' && (
          <Fade in>
            <Box sx={styles.cameraContainer}>
              {/* Live viewfinder — always visible until camera errors */}
              {cameraMutation.isError ? (
                <Box sx={styles.cameraPlaceholder}>
                  <CameraAltIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Camera access denied or unavailable.
                  </Typography>
                </Box>
              ) : (
                <Box sx={styles.videoWrapper}>
                  <Box
                    component="video"
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    sx={styles.video}
                  />
                  {!cameraReady && (
                    <Box sx={styles.videoLoading}>
                      <CircularProgress size={28} sx={{ color: '#fff' }} />
                    </Box>
                  )}
                  <IconButton sx={styles.flipBtn} onClick={handleFlipCamera}>
                    <FlipCameraIosIcon />
                  </IconButton>
                </Box>
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              <Button
                variant="contained"
                onClick={handleCapture}
                disabled={!cameraReady || cameraMutation.isError}
                sx={styles.captureBtn}
                startIcon={<CameraAltIcon />}
              >
                {images.length === 0 ? 'Capture Photo' : 'Capture Another'}
              </Button>

              {/* Captured images grid */}
              {images.length > 0 && (
                <Box sx={styles.capturedSection}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 0.5, display: 'block' }}
                  >
                    {images.length} photo{images.length > 1 ? 's' : ''} captured
                  </Typography>
                  <Box sx={styles.imageGrid}>
                    {images.map((img, i) => (
                      <Box key={i} sx={styles.imageTile}>
                        <Box component="img" src={img.preview} sx={styles.imageTileImg} />
                        <IconButton
                          size="small"
                          sx={styles.removeTileBtn}
                          onClick={() => removeImage(i)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Fade>
        )}

        {/* ── GALLERY TAB ── */}
        {tab === 'gallery' && (
          <Fade in>
            <Box sx={styles.cameraContainer}>
              {/* Always-visible add button */}
              <Box
                sx={{
                  ...styles.dropZone,
                  ...(images.length > 0 ? styles.dropZoneSecondary : {}),
                }}
                onClick={() => galleryInputRef.current?.click()}
              >
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleGalleryChange}
                />
                <Box sx={styles.dropIconWrapper}>
                  <AddPhotoAlternateIcon sx={styles.dropIcon} />
                </Box>
                <Typography variant="body2" fontWeight={600}>
                  {images.length === 0 ? 'Choose from Gallery' : 'Add More Photos'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tap to open your photo library
                </Typography>
              </Box>

              {/* Selected images grid */}
              {images.length > 0 && (
                <Box sx={styles.capturedSection}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 0.5, display: 'block' }}
                  >
                    {images.length} image{images.length > 1 ? 's' : ''} selected
                  </Typography>
                  <Box sx={styles.imageGrid}>
                    {images.map((img, i) => (
                      <Box key={i} sx={styles.imageTile}>
                        <Box component="img" src={img.preview} sx={styles.imageTileImg} />
                        <IconButton
                          size="small"
                          sx={styles.removeTileBtn}
                          onClick={() => removeImage(i)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Fade>
        )}

        {!isInstructor && !uploadAllowed && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            Uploads are only accepted during the active week ({UPLOAD_WINDOW_LABEL}).
          </Alert>
        )}
        {errorMsg && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {errorMsg}
          </Alert>
        )}
        {uploadMutation.isSuccess && (
          <Alert severity="success" sx={{ mt: 1.5 }}>
            Cheat sheet uploaded successfully!
          </Alert>
        )}
        <Box sx={styles.actions}>
          <Button variant="outlined" onClick={handleClose} disabled={uploadMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!canUpload}
            startIcon={
              uploadMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <UploadFileIcon />
              )
            }
          >
            {uploadMutation.isPending
              ? 'Uploading…'
              : images.length > 1
              ? `Upload ${images.length} Images`
              : 'Upload'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

const styles = {
  paper: {
    borderRadius: 3,
    overflow: 'hidden',
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    py: 1.5,
    px: 2.5,
  },
  titleInner: { display: 'flex', alignItems: 'center', gap: 1 },
  titleText: { fontWeight: 600 },
  closeBtn: {
    color: 'primary.contrastText',
    '&:hover': { bgcolor: 'primary.dark' },
  },
  content: {
    pt: 2,
    pb: 3,
    px: 3,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  tabs: {
    mb: 2,
    borderBottom: '1px solid',
    borderColor: 'divider',
    '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
  },
  tab: {
    minHeight: 44,
    fontSize: '0.8rem',
    textTransform: 'none',
    fontWeight: 500,
  },
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0.75,
    py: 4,
    borderRadius: 2.5,
    border: '2px dashed',
    borderColor: 'divider',
    bgcolor: 'background.default',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      borderColor: 'primary.main',
      bgcolor: 'primary.50',
    },
  },
  dropZoneActive: {
    borderColor: 'primary.main',
    bgcolor: 'primary.50',
    transform: 'scale(1.01)',
  },
  dropZoneHasFile: {
    borderStyle: 'solid',
    borderColor: 'success.main',
    bgcolor: 'success.50',
  },
  dropZoneSecondary: {
    py: 2.5,
    borderColor: 'primary.light',
    bgcolor: 'primary.50',
    '&:hover': {
      borderColor: 'primary.main',
      bgcolor: 'primary.100',
    },
  },
  dropIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    bgcolor: 'action.hover',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    mb: 0.5,
  },
  dropIcon: { fontSize: 28, color: 'text.disabled' },
  successIcon: { fontSize: 40, color: 'success.main', mb: 0.5 },
  fileName: {
    fontFamily: 'monospace',
    fontWeight: 600,
    color: 'text.primary',
    maxWidth: '90%',
  },
  // Camera styles
  cameraContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1.5,
  },
  videoWrapper: {
    position: 'relative',
    width: '100%',
    borderRadius: 2.5,
    overflow: 'hidden',
    bgcolor: '#000',
    aspectRatio: '4/3',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  videoLoading: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: 'rgba(0,0,0,0.5)',
  },
  flipBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    bgcolor: 'rgba(0,0,0,0.45)',
    color: '#fff',
    '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
  },
  captureBtn: {
    mt: 0.5,
    borderRadius: 5,
    px: 4,
    fontWeight: 600,
  },
  cameraPlaceholder: {
    width: '100%',
    aspectRatio: '4/3',
    borderRadius: 2.5,
    border: '2px dashed',
    borderColor: 'divider',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: 'background.default',
  },
  // Multi-image grid
  capturedSection: {
    width: '100%',
  },
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 1,
    width: '100%',
  },
  imageTile: {
    position: 'relative',
    borderRadius: 2,
    overflow: 'hidden',
    aspectRatio: '1',
    border: '2px solid',
    borderColor: 'success.main',
  },
  imageTileImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  removeTileBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
    bgcolor: 'rgba(0,0,0,0.55)',
    color: '#fff',
    padding: '3px',
    '&:hover': { bgcolor: 'rgba(200,0,0,0.75)' },
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 1.5,
    mt: 2.5,
  },
};
