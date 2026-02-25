import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LinkIcon from '@mui/icons-material/Link';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import VisibilityIcon from '@mui/icons-material/Visibility';

import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';

import { useState } from 'react';

import { getMaterials, CourseMaterial } from '@alea/spec';

interface MoreResourcesAccordionProps {
  courseId: string;
  semester: string;
  institutionId: string;
}

const ITEMS_PER_PAGE = 5;

export function MoreResourcesAccordion({
  courseId,
  semester,
  institutionId,
}: MoreResourcesAccordionProps) {
  console.log('MoreResourcesAccordion rendered with:', { courseId, semester, institutionId });

  const [resources, setResources] = useState<CourseMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);

  const handleExpand = async () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);

    if (!newExpanded || resources.length > 0) return;

    setLoading(true);
    setError(null);

    console.log(' Fetching resources for courseId:', courseId, 'semester:', semester);

    try {
      const data = await getMaterials(institutionId, courseId, semester);
      console.log(' API Response data:', data);
      setResources(data);
    } catch (error) {
      console.error('Error fetching resources:', error);
      setError('Could not load resources. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = resources;

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const visibleResources = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  return (
    <Box sx={{ mt: 4, mx: { xs: 2, sm: 3, md: 4 } }}>
      <Card
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 2,
          padding: 2,
          boxShadow: 1,
        }}
      >
        <Button
          variant="contained"
          onClick={handleExpand}
          sx={{
            width: '100%',
            height: '48px',
            fontSize: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            textTransform: 'none',
          }}
        >
          <Typography variant="h6" sx={{ margin: 0 }}>
            More Resources
          </Typography>
          <ExpandMoreIcon />
        </Button>

        {expanded && (
          <Box sx={{ mt: 2 }}>
            {/* Error */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Content */}
            {loading ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} />
              </Box>
            ) : resources.length === 0 ? (
              <Typography color="text.secondary" component="div">
                No resources available for this course.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {visibleResources.map((resource) => (
                  <Box
                    key={resource.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      boxShadow: 1,
                      transition: 'box-shadow 0.2s',
                      '&:hover': { boxShadow: 3 },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {resource.type === 'FILE' ? (
                        <PictureAsPdfIcon color="error" fontSize="small" />
                      ) : (
                        <InsertLinkIcon color="primary" fontSize="small" />
                      )}
                      <Typography variant="body2" fontWeight={700} color="text.primary">
                        {resource.materialName}
                      </Typography>
                    </Box>

                    {resource.type === 'FILE' ? (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View in browser">
                          <IconButton
                            size="small"
                            onClick={() => {
                              const cleanUrl = `/api/course-material/get-material-file-by-id?id=${resource.id}`;
                              window.open(cleanUrl, '_blank');
                            }}
                            sx={{ color: 'palette.secondary.main' }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download File">
                          <IconButton
                            size="small"
                            onClick={() => {
                              const cleanUrl = `/api/course-material/get-material-file-by-id?id=${resource.id}&download=true`;

                              const link = document.createElement('a');
                              link.href = cleanUrl;
                              const downloadFileName = resource.materialName;
                              link.download = downloadFileName;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            sx={{ color: 'palette.success.main' }}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Tooltip title="Open Link">
                        <IconButton
                          size="small"
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: 'palette.info.main' }}
                        >
                          <LinkIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                ))}
              </Box>
            )}
            {totalPages > 1 && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 2,
                  mt: 2,
                }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                  sx={{
                    color: page === 0 ? 'action.disabled' : 'primary.main',
                    borderColor: page === 0 ? 'action.disabled' : 'primary.main',
                    '&:hover:not(:disabled)': {
                      color: 'primary.dark',
                      borderColor: 'primary.dark',
                      backgroundColor: 'primary.light',
                    },
                  }}
                >
                  ←
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {page + 1} / {totalPages}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages - 1}
                  sx={{
                    color: page === totalPages - 1 ? 'action.disabled' : 'primary.main',
                    borderColor: page === totalPages - 1 ? 'action.disabled' : 'primary.main',
                    '&:hover:not(:disabled)': {
                      color: 'primary.dark',
                      borderColor: 'primary.dark',
                      backgroundColor: 'primary.light',
                    },
                  }}
                >
                  →
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Card>
    </Box>
  );
}
