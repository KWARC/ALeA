import DeleteIcon from '@mui/icons-material/Delete';
import UploadIcon from '@mui/icons-material/Upload';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LinkIcon from '@mui/icons-material/Link';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

import { useRef, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteMaterial,
  getMaterials,
  getMaterialFileUrl,
  postMaterial,
  copyPrevSemMaterial,
} from '@alea/spec';
import { getExtensionFromMime } from '@alea/utils';
import { getIconByExtension } from '@alea/react-utils';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

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
  const queryClient = useQueryClient();
  const [confirmCopyId, setConfirmCopyId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<{ id: string; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: fetchedResources,
    isLoading: loadingList,
    refetch: fetchResources,
  } = useQuery({
    queryKey: ['materials', universityId, courseId],
    queryFn: () => getMaterials(universityId, courseId),
    enabled: !!courseId && !!universityId,
    staleTime: 5 * 60 * 1000,
  });

  const SEMESTERS = useMemo(() => {
    const sems = new Set<string>();
    if (instanceId) sems.add(instanceId);

    if (fetchedResources) {
      fetchedResources.forEach((r) => {
        if (r.instanceId) sems.add(r.instanceId);
      });
    }
    return Array.from(sems).sort((a, b) => {
      if (a === instanceId) return -1;
      if (b === instanceId) return 1;
      return a.localeCompare(b);
    });
  }, [instanceId, fetchedResources]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [materialName, setMaterialName] = useState('');
  const [type, setType] = useState<'FILE' | 'LINK'>('FILE');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getDefaultExpiryDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  };

  const getYearLater = (baseDate: string) => {
    if (!baseDate) return getTodayDate();
    const date = new Date(baseDate);
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const [validFrom, setValidFrom] = useState('');
  const [validTill, setValidTill] = useState('');
  const [showValidity, setShowValidity] = useState(false);
  const [duplicateError, setDuplicateError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedSemesterIndex, setSelectedSemesterIndex] = useState(0);
  const itemsPerPage = 5;

  if (!courseId) return null;

  const resources = fetchedResources ?? [];
  const selectedSemesterCategory = SEMESTERS[selectedSemesterIndex];
  const filteredResources = resources.filter((r) => r.instanceId === selectedSemesterCategory);
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
      if (showValidity) {
        if (validFrom) formData.append('validFrom', validFrom);
        if (validTill) formData.append('validTill', validTill);
      }

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

      setDuplicateError('');
      setToast({ type: 'success', text: 'Resource uploaded successfully!' });
      setMaterialName('');
      setUrl('');
      setValidFrom('');
      setValidTill('');
      setShowValidity(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchResources();
    } catch (error: any) {
      console.error('Upload error:', error);
      if (error?.response?.status === 409) {
        const existingInst = error.response.data?.existingInstance;
        setDuplicateError(
          existingInst
            ? `This resource is already existing in ${existingInst}.`
            : 'This resource has already been uploaded/added.'
        );
      } else {
        setToast({
          type: 'error',
          text: error?.response?.data || error.message || 'Failed to upload resource',
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (resourceId: string) => {
    try {
      await deleteMaterial(resourceId);

      setConfirmDeleteId(null);
      setToast({ type: 'success', text: 'Resource deleted' });
      await queryClient.invalidateQueries({
        queryKey: ['materials', universityId, courseId],
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      setToast({ type: 'error', text: error.message || 'Failed to delete resource' });
    }
  };

  const handleCopyToSemester = async (targetSem: string, resourceId: string) => {
    try {
      setCopyError(null);
      await copyPrevSemMaterial(resourceId, courseId, universityId);
      setDuplicateError('');
      setToast({ type: 'success', text: `Resource copied to ${targetSem} successfully!` });
      queryClient.invalidateQueries({
        queryKey: ['materials', universityId, courseId, targetSem],
      });
      await fetchResources();
      setConfirmCopyId(null);
    } catch (error: any) {
      const message = error?.response?.data?.message || error.message || 'Failed to copy resource';
      if (error?.response?.status === 409) {
        setCopyError({ id: resourceId, message });
      } else {
        setToast({ type: 'error', text: message });
        setConfirmCopyId(null);
      }
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

        <FormControlLabel
          control={
            <Checkbox
              checked={showValidity}
              onChange={(e) => setShowValidity(e.target.checked)}
              size="small"
            />
          }
          label={<Typography variant="body2">Availability Window</Typography>}
        />
        {showValidity && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Valid From"
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              onFocus={() => {
                if (!validFrom) setValidFrom(getTodayDate());
              }}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Valid Till"
              type="date"
              value={validTill}
              onChange={(e) => setValidTill(e.target.value)}
              onFocus={() => {
                if (!validTill) {
                  setValidTill(validFrom ? getYearLater(validFrom) : getDefaultExpiryDate());
                }
              }}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        )}

        {type === 'FILE' ? (
          <>
            <input
              type="file"
              accept=".pdf,.txt,.json,.md,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.zip,.rar,.png,.jpg,.jpeg,.gif"
              ref={fileInputRef}
              onChange={() => setDuplicateError('')}
            />
            {duplicateError && (
              <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                {duplicateError}
              </Typography>
            )}
          </>
        ) : (
          <>
            <TextField
              label="URL"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setDuplicateError('');
              }}
              fullWidth
              size="small"
              placeholder="https://..."
            />
            {duplicateError && (
              <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                {duplicateError}
              </Typography>
            )}
          </>
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

      <Box sx={{ mb: 2 }}>
        <Tabs
          value={selectedSemesterIndex}
          onChange={(_e, newValue) => {
            setSelectedSemesterIndex(newValue);
            setCurrentPage(0);
          }}
        >
          {SEMESTERS.map((sem) => (
            <Tab
              key={sem}
              label={
                <Typography variant="body2" fontWeight={700}>
                  {instanceId === sem ? 'Current Semester' : sem}
                </Typography>
              }
            />
          ))}
        </Tabs>
      </Box>

      {loadingList ? (
        <Box display="flex" justifyContent="center">
          <CircularProgress size={24} />
        </Box>
      ) : filteredResources.length === 0 ? (
        <Typography color="text.secondary" component="div">
          No resources uploaded yet.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {displayResources.map((resource) => (
            <Box
              key={resource.id}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
                p: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: '1 1 auto',
                  minWidth: '200px',
                  justifyContent: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {resource.type === 'FILE' ? (
                    getIconByExtension(getExtensionFromMime(resource?.mimeType), {
                      fontSize: 'small',
                    }) ?? <InsertDriveFileIcon color="primary" fontSize="small" />
                  ) : (
                    <InsertLinkIcon color="primary" fontSize="small" />
                  )}
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {resource.materialName}
                  </Typography>
                </Box>
                {(resource.validFrom || resource.validTill) && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block' }}
                  >
                    {resource.validFrom &&
                      `Valid-From:${formatDateForDisplay(resource.validFrom)}`}
                    {resource.validFrom && resource.validTill && ' | '}
                    {resource.validTill &&
                      `Valid-Till:${formatDateForDisplay(resource.validTill)}`}
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {selectedSemesterIndex > 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    {confirmCopyId === resource.id ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          Copy to current semester?
                        </Typography>
                        <Button
                          size="small"
                          variant="contained"
                          sx={{ minWidth: 0, px: 1, py: 0, fontSize: '0.7rem' }}
                          onClick={() => handleCopyToSemester(SEMESTERS[0], resource.id)}
                        >
                          Yes
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{ minWidth: 0, px: 1, py: 0, fontSize: '0.7rem' }}
                          onClick={() => {
                            setConfirmCopyId(null);
                            setCopyError(null);
                          }}
                        >
                          No
                        </Button>
                      </Box>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setConfirmCopyId(resource.id);
                          setCopyError(null);
                        }}
                        title="Copy to current semester"
                        sx={{ color: 'text.secondary' }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    )}
                    {copyError?.id === resource.id && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, lineHeight: 1.1 }}>
                        {copyError.message}
                      </Typography>
                    )}
                  </Box>
                )}

                {resource.type === 'FILE' ? (
                  <IconButton
                    size="small"
                    onClick={() => {
                      window.open(getMaterialFileUrl(resource.id), '_blank');
                    }}
                    title="View"
                    sx={{ color: 'palette.secondary.main' }}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                ) : (
                  <IconButton
                    size="small"
                    onClick={() => window.open(resource.url, '_blank')}
                    title="Open Link"
                    sx={{ color: 'palette.info.main' }}
                  >
                    <LinkIcon fontSize="small" />
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
