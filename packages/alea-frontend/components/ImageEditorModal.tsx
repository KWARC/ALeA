import React, { useState, useRef } from 'react';
import { Button, Box, Modal, Typography, Slider, Stack } from '@mui/material';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageEditorModalProps {
  open: boolean;
  image: string;
  onSave: (editedImageBlob: Blob) => void;
  onClose: () => void;
}

async function getCroppedImg(
  image: HTMLImageElement,
  pixelCrop: PixelCrop,
  rotation = 0
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('No 2d context');

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = Math.floor(pixelCrop.width * scaleX);
  canvas.height = Math.floor(pixelCrop.height * scaleY);

  ctx.imageSmoothingQuality = 'high';

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  ctx.save();

  ctx.translate(centerX, centerY);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-centerX, -centerY);

  ctx.drawImage(
    image,
    0, 0, image.naturalWidth, image.naturalHeight,
    -pixelCrop.x * scaleX, 
    -pixelCrop.y * scaleY, 
    image.naturalWidth,
    image.naturalHeight
  );

  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Canvas empty'));
      resolve(blob);
    }, 'image/jpeg', 0.95);
  });
}

export default function ImageEditorModal({ open, image, onSave, onClose }: ImageEditorModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rotate, setRotate] = useState(0); 
  const imgRef = useRef<HTMLImageElement>(null);

  const handleSave = async () => {
    try {
      if (imgRef.current && completedCrop) {
        const blob = await getCroppedImg(imgRef.current, completedCrop, rotate);
        onSave(blob);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: { xs: '95%', sm: 600 }, bgcolor: 'background.paper', p: 4, borderRadius: 2, boxShadow: 24,
        maxHeight: '95vh', overflowY: 'auto'
      }}>
        <Typography variant="h6" mb={2}>Edit & Rotate Image</Typography>

        <Box sx={{ textAlign: 'center', bgcolor: '#1a1a1a', borderRadius: 1, p: 1, overflow: 'hidden' }}>
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
          >
            <img
              ref={imgRef}
              src={image}
              alt="Source"
              style={{ 
                maxWidth: '100%', 
                maxHeight: '50vh',
                transform: `rotate(${rotate}deg)`, 
                transition: 'transform 0.2s ease' 
              }}
            />
          </ReactCrop>
        </Box>

        <Box sx={{ mt: 3, px: 2 }}>
          <Typography gutterBottom variant="caption">Rotation: {rotate}°</Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <RotateRightIcon color="action" />
            <Slider
              value={rotate}
              min={0}
              max={360}
              step={1}
              onChange={(_, v) => setRotate(v as number)}
              valueLabelDisplay="auto"
            />
          </Stack>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={onClose}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSave}
            disabled={!completedCrop?.width}
          >
            Save Edited Image
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}