import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LinkIcon from '@mui/icons-material/Link';

import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
  Tab,
  Tabs,
  Divider,
} from '@mui/material';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMaterials, getMaterialFileUrl, CourseMaterial } from '@alea/spec';
import { getCurrentTermForUniversity, getExtensionFromMime } from '@alea/utils';
import { getIconByExtension } from '@alea/react-utils';
import { InsertDriveFile } from '@mui/icons-material';

interface MoreResourcesAccordionProps {
  courseId: string;
  semester: string;
  institutionId: string;
}

const ITEMS_PER_PAGE = 5;
const generateSemesters = (startTerm: string, count = 8): string[] => {
  const semesters: string[] = [];
  if (!startTerm || typeof startTerm !== 'string' || startTerm === 'null') {
    const genericSemesters: string[] = [];
    for (let i = 1; i <= count; i++) {
      const suffix = ['st', 'nd', 'rd'][((((i + 90) % 100) - 10) % 10) - 1] || 'th';
      genericSemesters.push(`${i}${suffix} Sem`);
    }
    return genericSemesters;
  }

  let currentSeason = startTerm.substring(0, 2);
  const digits = startTerm.match(/\d+/);
  const currentYearStr = digits ? digits[0] : null;

  if (!currentYearStr) return [startTerm];
  let currentYear = parseInt(currentYearStr, 10);
  if (currentSeason === 'SS') {
    currentSeason = 'WS';
  }

  for (let i = 0; i < count; i++) {
    if (currentSeason === 'WS') {
      semesters.push(`WS${currentYear}-${currentYear + 1}`);
      currentSeason = 'SS';
    } else {
      semesters.push(`SS${currentYear}-${currentYear + 1}`);
      currentSeason = 'WS';
      currentYear = currentYear - 1;
    }
  }
  return semesters;
};

export function MoreResourcesAccordion({
  courseId,
  semester,
  institutionId,
}: MoreResourcesAccordionProps) {
  const startTerm = getCurrentTermForUniversity(institutionId);
  const SEMESTERS = useMemo(() => generateSemesters(startTerm, 8), [startTerm]);

  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedSemesterIndex, setSelectedSemesterIndex] = useState(0);

  const selectedSemesterCategory = SEMESTERS[selectedSemesterIndex];

  const {
    data: resources = [],
    isLoading: loading,
    isError,
    error,
  } = useQuery<CourseMaterial[]>({
    queryKey: ['materials', institutionId, courseId, selectedSemesterCategory],
    queryFn: () => getMaterials(institutionId, courseId, selectedSemesterCategory),
    enabled: expanded,
    staleTime: 5 * 60 * 1000,
  });

  const handleExpand = () => {
    setExpanded((prev) => !prev);
  };

  const filtered = resources;
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const visibleResources = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  return (
    <Box sx={styles.wrapper}>
      <Card sx={styles.card}>
        <Button variant="contained" onClick={handleExpand} sx={styles.expandButton}>
          <Typography variant="h6" sx={styles.typographyTitle}>
            More Resources
          </Typography>
          <ExpandMoreIcon />
        </Button>

        {expanded && (
          <Box sx={styles.expandedContent}>
            <Box sx={{ mb: 2 }}>
              <Tabs
                value={selectedSemesterIndex}
                onChange={(_e, newValue) => {
                  setSelectedSemesterIndex(newValue);
                  setPage(0);
                }}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    minWidth: 90,
                  },
                }}
              >
                {SEMESTERS.map((sem, index) => (
                  <Tab
                    key={sem}
                    label={
                      <Typography variant="body2" fontWeight={700}>
                        {index === 0 ? 'Current Semester' : sem}
                      </Typography>
                    }
                  />
                ))}
              </Tabs>
            </Box>
            {isError && (
              <Alert severity="error" sx={styles.errorAlert}>
                {(error as Error)?.message || 'Could not load resources. Please try again.'}
              </Alert>
            )}
            {loading ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} />
              </Box>
            ) : resources.length === 0 ? (
              <Typography color="text.secondary" component="div">
                No resources available for this course.
              </Typography>
            ) : (
              <Box sx={styles.resourceList}>
                {visibleResources.map((resource) => (
                  <Box key={resource.id} sx={styles.resourceRow}>
                    <Box sx={styles.resourceInfo}>
                      {resource.type === 'FILE' ? (
                        getIconByExtension(getExtensionFromMime(resource?.mimeType), {
                          fontSize: 'small',
                        }) ?? <InsertDriveFile color="primary" fontSize="small" />
                      ) : (
                        <InsertLinkIcon color="primary" fontSize="small" />
                      )}
                      <Typography variant="body2" fontWeight={700} color="text.primary">
                        {resource.materialName}
                      </Typography>
                    </Box>

                    {resource.type === 'FILE' ? (
                      <Box sx={styles.actionButtons}>
                        <Tooltip title="View in browser">
                          <IconButton
                            size="small"
                            onClick={() => window.open(getMaterialFileUrl(resource.id), '_blank')}
                            sx={styles.viewButton}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download File">
                          <IconButton
                            size="small"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = getMaterialFileUrl(resource.id, true);
                              link.download = resource.materialName;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            sx={styles.downloadButton}
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
                          sx={styles.linkButton}
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
              <Box sx={styles.pagination}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                  sx={styles.paginationButton(page === 0)}
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
                  sx={styles.paginationButton(page === totalPages - 1)}
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
const styles = {
  wrapper: {
    mt: 4,
    mx: { xs: 2, sm: 3, md: 4 },
  },
  card: {
    bgcolor: 'background.paper',
    borderRadius: 2,
    padding: 2,
    boxShadow: 1,
  },
  expandButton: {
    width: '100%',
    height: '48px',
    fontSize: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    textTransform: 'none',
  },
  typographyTitle: {
    margin: 0,
  },
  expandedContent: {
    mt: 2,
  },
  errorAlert: {
    mb: 2,
  },
  resourceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
  },
  resourceRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    p: 1,
    borderRadius: 2,
    bgcolor: 'background.paper',
    boxShadow: 1,
    transition: 'box-shadow 0.2s',
    '&:hover': { boxShadow: 3 },
  },
  resourceInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
  },
  actionButtons: {
    display: 'flex',
    gap: 1,
  },
  viewButton: {
    color: 'palette.success.main',
  },
  downloadButton: {
    color: 'palette.success.main',
  },
  linkButton: {
    color: 'palette.info.main',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    mt: 2,
  },
  paginationButton: (disabled: boolean) => ({
    color: disabled ? 'action.disabled' : 'primary.main',
    borderColor: disabled ? 'action.disabled' : 'primary.main',
    '&:hover:not(:disabled)': {
      color: 'primary.dark',
      borderColor: 'primary.dark',
      backgroundColor: 'primary.light',
    },
  }),
};
