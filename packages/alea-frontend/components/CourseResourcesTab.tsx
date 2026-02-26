import DeleteIcon from '@mui/icons-material/Delete';
import UploadIcon from '@mui/icons-material/Upload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LinkIcon from '@mui/icons-material/Link';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  deleteMaterial,
  getMaterials,
  postMaterial,
  getMaterialFileUrl,
  CourseMaterial,
} from '@alea/spec';

interface CourseResourcesTabProps {
  courseId: string;
  instanceId: string;
  universityId: string;
}

export default function CourseResourcesTab({
  courseId,
  instanceId,
  universityId,
}: CourseResourcesTabProps) {
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [materialName, setMaterialName] = useState('');
  const [type, setType] = useState<'FILE' | 'LINK'>('FILE');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: resources = [],
    isLoading: loadingList,
    refetch: fetchResources,
  } = useQuery<CourseMaterial[]>({
    queryKey: ['materials', universityId, courseId, instanceId],
    queryFn: () => getMaterials(universityId, courseId, instanceId),
    enabled: !!courseId && !!instanceId,
  });

  const filteredResources = resources;
  const totalPages = Math.ceil(filteredResources.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayResources = filteredResources.slice(startIndex, endIndex);

  const handleUpload = async () => {
    if (!materialName.trim()) {
      setToast({ type: 'error', text: 'Please enter a name' });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('universityId', universityId);
      formData.append('courseId', courseId);
      formData.append('instanceId', instanceId);
      formData.append('type', type);
      formData.append('materialName', materialName);

      if (type === 'FILE') {
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
          setToast({ type: 'error', text: 'Please select a file' });
          setUploading(false);
          return;
        }
        formData.append('file', file);
      } else {
        if (!url.trim()) {
          setToast({ type: 'error', text: 'Please enter a URL' });
          setUploading(false);
          return;
        }
        formData.append('url', url);
      }

      await postMaterial(formData);

      setToast({ type: 'success', text: 'Resource uploaded successfully!' });
      setMaterialName('');
      setUrl('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchResources();
    } catch (error) {
      console.error('Upload error:', error);
      setToast({ type: 'error', text: error.message || 'Failed to upload resource' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (resourceId: string) => {
    try {
      await deleteMaterial(resourceId);

      setConfirmDeleteId(null);
      setToast({ type: 'success', text: 'Resource deleted' });
      await fetchResources();
    } catch (error) {
      console.error('Delete error:', error);
      setToast({ type: 'error', text: error.message || 'Failed to delete resource' });
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2, mt: 2 }}>
      <Typography variant="h6" fontWeight="bold" color="primary" mb={2}>
        Course Resources
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <TextField
          label="Resource Name"
          value={materialName}
          onChange={(e) => setMaterialName(e.target.value)}
          fullWidth
          size="small"
        />

        <FormControl size="small" fullWidth>
          <InputLabel>Resource Type</InputLabel>
          <Select
            value={type}
            label="Resource Type"
            onChange={(e) => setType(e.target.value as 'FILE' | 'LINK')}
          >
            <MenuItem value="FILE">File</MenuItem>
            <MenuItem value="LINK">Link</MenuItem>
          </Select>
        </FormControl>

        {type === 'FILE' ? (
          <input type="file" accept=".pdf,.txt,.json,.md" ref={fileInputRef} />
        ) : (
          <TextField
            label="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            fullWidth
            size="small"
            placeholder="https://..."
          />
        )}

        <Button
          variant="contained"
          startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload Resource'}
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />
      {loadingList ? (
        <Box display="flex" justifyContent="center">
          <CircularProgress size={24} />
        </Box>
      ) : filteredResources.length === 0 ? (
        <Typography color="text.secondary" component="div">
          No resources uploaded yet.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {displayResources.map((resource) => (
            <Box
              key={resource.id}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {resource.type === 'FILE' ? (
                  <PictureAsPdfIcon color="error" fontSize="small" />
                ) : (
                  <InsertLinkIcon color="primary" fontSize="small" />
                )}
                <Typography variant="body2" fontWeight={600}>
                  {resource.materialName}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {resource.type === 'FILE' ? (
                  <IconButton
                    size="small"
                    onClick={() => {
                      window.open(getMaterialFileUrl(resource.id), '_blank');
                    }}
                    sx={{ color: 'palette.secondary.main' }}
                  >
                    <VisibilityIcon />
                  </IconButton>
                ) : (
                  <IconButton
                    size="small"
                    onClick={() => window.open(resource.url, '_blank')}
                    sx={{ color: 'palette.info.main' }}
                  >
                    <LinkIcon />
                  </IconButton>
                )}
                {confirmDeleteId === resource.id ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      Are you sure?
                    </Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(resource.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => setConfirmDeleteId(null)}>
                      ×
                    </IconButton>
                  </Box>
                ) : (
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setConfirmDeleteId(resource.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}
      {totalPages > 1 && (
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 2 }}
        >
          <IconButton
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 0}
            size="small"
            sx={{
              color: currentPage === 0 ? 'action.disabled' : 'primary.main',
              '&:hover:not(:disabled)': {
                color: 'primary.dark',
                backgroundColor: 'primary.light',
              },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>

          <Typography variant="body2" color="text.secondary">
            {currentPage + 1} / {totalPages}
          </Typography>

          <IconButton
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
            size="small"
            sx={{
              color: currentPage === totalPages - 1 ? 'action.disabled' : 'primary.main',
              '&:hover:not(:disabled)': {
                color: 'primary.dark',
                backgroundColor: 'primary.light',
              },
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
      )}

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)}>
        <Alert severity={toast?.type}>{toast?.text}</Alert>
      </Snackbar>
    </Paper>
  );
}

