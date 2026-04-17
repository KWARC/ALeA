import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Typography,
  Alert,
  Tabs,
  Tab,
  Fade,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { postScannedCheatSheet } from '@alea/spec';
import ImageEditorModal from './ImageEditorModal';

async function imagesToPDF(imageFiles: File[]): Promise<Blob> {
  const encoder = new TextEncoder();

  const pages = await Promise.all(
    imageFiles.map(
      (f) =>
        new Promise<{ b64: string; w: number; h: number }>((resolve, reject) => {
          const url = URL.createObjectURL(f);
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d')!.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            URL.revokeObjectURL(url);
            resolve({
              b64: dataUrl.replace(/^data:image\/jpeg;base64,/, ''),
              w: img.naturalWidth,
              h: img.naturalHeight,
            });
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
          };
          img.src = url;
        })
    )
  );

  const catalogId = 1;
  const pagesId = 2;
  const pageId = (i: number) => 3 + i * 3;
  const contId = (i: number) => 3 + i * 3 + 1;
  const imgId = (i: number) => 3 + i * 3 + 2;
  const totalObjs = 2 + pages.length * 3;

  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let cursor = 0;

  function addPart(src: string | Uint8Array) {
    const buf = typeof src === 'string' ? encoder.encode(src) : src;
    offsets.push(cursor);
    parts.push(buf);
    cursor += buf.length;
  }

  const headerBytes = encoder.encode('%PDF-1.4\n');
  parts.push(headerBytes);
  cursor += headerBytes.length;

  addPart(`${catalogId} 0 obj\n<</Type /Catalog /Pages ${pagesId} 0 R>>\nendobj\n`);

  const kids = pages.map((_, i) => `${pageId(i)} 0 R`).join(' ');
  addPart(`${pagesId} 0 obj\n<</Type /Pages /Kids [${kids}] /Count ${pages.length}>>\nendobj\n`);

  for (let i = 0; i < pages.length; i++) {
    const { b64, w, h } = pages[i];
    const binLen =
      Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);

    addPart(
      `${pageId(i)} 0 obj\n` +
        `<</Type /Page /Parent ${pagesId} 0 R ` +
        `/MediaBox [0 0 ${w} ${h}] ` +
        `/Contents ${contId(i)} 0 R ` +
        `/Resources <</XObject <</Im0 ${imgId(i)} 0 R>>>>>>\nendobj\n`
    );

    const cs = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    addPart(`${contId(i)} 0 obj\n<</Length ${cs.length}>>\nstream\n${cs}\nendstream\nendobj\n`);

    const head = encoder.encode(
      `${imgId(i)} 0 obj\n` +
        `<</Type /XObject /Subtype /Image ` +
        `/Width ${w} /Height ${h} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 ` +
        `/Filter /DCTDecode /Length ${binLen}>>\nstream\n`
    );
    const body = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const foot = encoder.encode('\nendstream\nendobj\n');
    const imgObj = new Uint8Array(head.length + body.length + foot.length);
    imgObj.set(head);
    imgObj.set(body, head.length);
    imgObj.set(foot, head.length + body.length);
    offsets.push(cursor);
    parts.push(imgObj);
    cursor += imgObj.length;
  }

  const xrefStart = cursor;
  let xref = `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<</Size ${
    totalObjs + 1
  } /Root ${catalogId} 0 R>>\nstartxref\n${xrefStart}\n%%EOF\n`;
  parts.push(encoder.encode(xref));

  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return new Blob([out], { type: 'application/pdf' });
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

export interface UploadCheatSheetContentProps {
  instanceId: string;
  courseId: string;
  universityId: string;
  userId: string;
  isInstructor?: boolean;
  onUploaded: () => void;
  onClose: () => void;
}
type UploadWindowStatus = 'PAST' | 'CURRENT' | 'FUTURE';
interface UploadContext {
  windowStart: string; // ISO
  windowEnd: string; // ISO
  status: UploadWindowStatus;
}
export function UploadCheatSheetContent({
  isInstructor = false,
  onUploaded,
  onClose,
}: UploadCheatSheetContentProps) {
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
  const [successMsg, setSuccessMsg] = useState('');
  const [uploadContext, setUploadContext] = useState<UploadContext | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [editingImagePreview, setEditingImagePreview] = useState<string>('');
  const cameraMutation = useMutation({
    mutationFn: async (facing: 'environment' | 'user') => {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not supported');
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      setCameraReady(false);

      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
        });
      } catch (err) {
        console.warn('Fallback to default camera', err);
        return await navigator.mediaDevices.getUserMedia({ video: true });
      }
    },

    onSuccess: (stream) => {
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    },

    onError: (err) => {
      console.error('Camera error:', err);
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
        return await postScannedCheatSheet(formData);
      } else if (images.length > 0) {
        const pdfBlob = await imagesToPDF(images.map((img) => img.file));
        const pdfFile = new File([pdfBlob], `cheatsheet-${Date.now()}.pdf`, {
          type: 'application/pdf',
        });
        const formData = new FormData();
        formData.append('file', pdfFile);
        return await postScannedCheatSheet(formData);
      }
    },
    onSuccess: (data: any) => {
      setFile(null);
      setImages([]);
      setSuccessMsg(data?.message || 'Cheatsheet uploaded successfully!');
      if (data?.uploadContext && isInstructor) {
        setUploadContext(data.uploadContext);
      }
      onUploaded();
    },
    onError: (err: any) => {
      if (isInstructor) return;
      const errorMessage =
        typeof err?.response?.data === 'string'
          ? err.response.data
          : err?.response?.data?.message ??
            err?.message ??
            'Something went wrong. Please try again.';
      setErrorMsg(errorMessage);
    },
  });

  function resetState() {
    setFile(null);
    setImages([]);
    setErrorMsg('');
    setSuccessMsg('');
    setUploadContext(null);
    setTab('file');
    uploadMutation.reset();
    stopCamera();
  }

  function handleTabChange(v: UploadTab) {
    setTab(v);
    setFile(null);
    setImages([]);
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
    if (files) Array.from(files).forEach((f) => addImageFile(f));
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

  function handleClose() {
    if (uploadMutation.isPending) return;
    resetState();
    onClose();
  }
  function handleEditImage(index: number) {
    setEditingImageIndex(index);
    setEditingImagePreview(images[index].preview);
  }

  function handleEditImageClose() {
    setEditingImageIndex(null);
    setEditingImagePreview('');
  }

  function handleEditImageSave(editedBlob: Blob) {
    if (editingImageIndex === null) return;

    const editedFile = new File([editedBlob], `edited-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });

    const editedPreview = URL.createObjectURL(editedBlob);

    setImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[editingImageIndex].preview);
      next[editingImageIndex] = {
        file: editedFile,
        preview: editedPreview,
      };
      return next;
    });

    handleEditImageClose();
  }

  const hasContent = tab === 'file' ? Boolean(file) : images.length > 0;
  const canUpload = hasContent && !uploadMutation.isPending && uploadAllowed;

  return (
    <>
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

            {images.length > 0 && (
              <Box sx={styles.capturedSection}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  {images.length} photo{images.length > 1 ? 's' : ''} captured
                </Typography>
                <ImageGrid images={images} onRemove={removeImage} onEdit={handleEditImage} />
              </Box>
            )}
          </Box>
        </Fade>
      )}

      {tab === 'gallery' && (
        <Fade in>
          <Box sx={styles.cameraContainer}>
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

            {images.length > 0 && (
              <Box sx={styles.capturedSection}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  {images.length} image{images.length > 1 ? 's' : ''} selected
                </Typography>
                <ImageGrid images={images} onRemove={removeImage} onEdit={handleEditImage} />
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
          <Box>
            <div>{successMsg}</div>
            {uploadContext && (
              <Box sx={{ mt: 1, fontSize: '0.875rem', opacity: 0.9 }}>
                <div>
                  📅 Window: {new Date(uploadContext.windowStart).toLocaleString()} →{' '}
                  {new Date(uploadContext.windowEnd).toLocaleString()}
                </div>
                <div>
                  Status: {uploadContext.status === 'CURRENT' ? '✓ Current' : uploadContext.status}
                </div>
              </Box>
            )}
          </Box>
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
      {editingImageIndex !== null && (
        <ImageEditorModal
          open={editingImageIndex !== null}
          image={editingImagePreview}
          onSave={handleEditImageSave}
          onClose={handleEditImageClose}
        />
      )}
    </>
  );
}

interface ImageGridProps {
  images: ImageEntry[];
  onRemove: (index: number) => void;
}
function ImageGrid({ images, onRemove, onEdit }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      {images.map((img, index) => (
        <Box key={index} sx={{ position: 'relative' }}>
          <img
            src={img.preview}
            style={{ width: 100, height: 100, objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => onEdit(index)} // 🔥 CLICK TO EDIT
          />

          <button onClick={() => onRemove(index)}>X</button>
        </Box>
      ))}
    </Box>
  );
}

const styles = {
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
