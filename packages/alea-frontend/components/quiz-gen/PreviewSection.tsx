import { getFlamsServer } from '@kwarc/ftml-react';
import InfoIcon from '@mui/icons-material/Info';
import TuneIcon from '@mui/icons-material/Tune';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { GenerationParams } from '@stex-react/api';
import { UriProblemViewer } from '@stex-react/stex-react-renderer';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { FlatQuizProblem } from '../../pages/quiz-gen';
import { QuizProblemViewer } from '../GenerateQuiz';

interface PreviewSectionProps {
  previewMode: 'json' | 'stex';
  setPreviewMode: (mode: 'json' | 'stex') => void;
  problemData?: FlatQuizProblem;
  editableSTeX: string;
  setEditableSTeX: (stex: string) => void;
  previousVersions?: FlatQuizProblem[];
  onLatestVersionChange: (selectedVersion: FlatQuizProblem) => void;
}

const VersionLeadNode = ({ index, isSelected }: { index: number; isSelected: boolean }) => {
  return (
    <Box
      sx={{
        minWidth: 120,
        height: 48,
        border: 2,
        borderColor: isSelected ? 'primary.main' : 'grey.300',
        backgroundColor: isSelected ? 'primary.main' : 'background.paper',
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isSelected
          ? '0 4px 12px rgba(25, 118, 210, 0.15)'
          : '0 2px 4px rgba(0, 0, 0, 0.1)',
        '&:hover': {
          borderColor: 'primary.main',
          backgroundColor: isSelected ? 'primary.main' : 'primary.50',
          transform: 'translateY(-1px)',
          boxShadow: isSelected
            ? '0 6px 16px rgba(25, 118, 210, 0.2)'
            : '0 4px 12px rgba(25, 118, 210, 0.1)',
        },
        '&:active': {
          transform: 'translateY(0px)',
        },
      }}
    >
      <Typography
        variant="body2"
        fontWeight={600}
        sx={{
          color: isSelected ? 'white' : 'text.primary',
          fontSize: '0.875rem',
        }}
      >
        Version {index + 1}
      </Typography>
      <Box
        sx={{
          fontSize: '14px',
          color: isSelected ? 'white' : 'primary.main',
          fontWeight: 600,
          transform: 'translateX(2px)',
        }}
      >
        ›
      </Box>

      {isSelected && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 2,
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
            pointerEvents: 'none',
          }}
        />
      )}
    </Box>
  );
};

export const PreviewSection = ({
  previewMode,
  setPreviewMode,
  problemData,
  editableSTeX,
  setEditableSTeX,
  previousVersions,
  onLatestVersionChange,
}: PreviewSectionProps) => {
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(1);
  const [showVersionTrack, setShowVersionTrack] = useState(false);
  const [uriStex, setUriStex] = useState('');
  const versionOptions = useMemo(() => previousVersions ?? [], [previousVersions]);
    const filteredVersions = versionOptions.filter((option, index) => {
    const mode = (option?.generationParams as any)?.mode;
    const hasManualEdits = Array.isArray(option?.manualEdits) && option.manualEdits.length > 0;
    const isLatest = index === versionOptions.length - 1;

    if (mode !== 'copy') return true;
    return isLatest || hasManualEdits;
  });
  
  //const selectedVersion = versionOptions[selectedVersionIndex];
  const selectedVersion = filteredVersions[selectedVersionIndex];
  const latestManualEdit = selectedVersion?.manualEdits?.[selectedVersion.manualEdits.length - 1];
  const isLatestVersion = selectedVersionIndex === versionOptions.length - 1;
  const manualEditPresentInVersion =
    Array.isArray(selectedVersion?.manualEdits) && selectedVersion?.manualEdits.length > 0;

  async function fetchRawStexFromUri(problemUri: string) {
    const sourceLink = await getFlamsServer().sourceFile({ uri: problemUri });
    if (!sourceLink) return null;
    const rawStexLink = sourceLink.replace('-/blob', '-/raw');
    const response = await axios.get(rawStexLink);
    return response.data;
  }
  const isModified = useMemo(() => {
    const original = selectedVersion?.problemStex ?? problemData?.problemStex;
    return editableSTeX !== original;
  }, [editableSTeX, problemData]);

  useEffect(() => {
    if (filteredVersions.length > 0) {
      setSelectedVersionIndex(filteredVersions.length - 1);
    }
  }, [filteredVersions]);

  useEffect(() => {
    if (!selectedVersion?.problemUri) return;
    setUriStex(selectedVersion?.problemUri);
  }, [selectedVersion]);
  console.log({selectedVersion})
  console.log({selectedVersionIndex})
  useEffect(() => {
    onLatestVersionChange?.(selectedVersion);
  }, [selectedVersion, versionOptions]);

  useEffect(() => {
    setPreviewMode(isModified || manualEditPresentInVersion ? 'stex' : 'json');
  }, [isModified, manualEditPresentInVersion]);

  useEffect(() => {
    if (manualEditPresentInVersion && latestManualEdit) {
      setEditableSTeX(latestManualEdit?.editedText);
    } else if (selectedVersion?.problemStex === null && selectedVersion?.problemUri) {
      fetchRawStexFromUri(uriStex).then((fetchedSTeX) => {
        setEditableSTeX(fetchedSTeX);
      });
    } else {
      setEditableSTeX(selectedVersion?.problemStex);
    }
  }, [selectedVersion]);

  return (
    <Box flex={1} display="flex" flexDirection="column" minHeight={0} overflow="hidden">
      <Box
        p={2}
        bgcolor="grey.50"
        borderBottom="1px solid"
        borderColor="divider"
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexShrink={0}
        overflow="auto"
        mb={1}
      >
        {versionOptions.length > 0 && (
          <Box display="flex" alignItems="center" gap={1.5}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="version-select-label">Version</InputLabel>
              <Select
                labelId="version-select-label"
                value={selectedVersionIndex}
                label="Version"
                onChange={(e) => setSelectedVersionIndex(Number(e.target.value))}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      borderRadius: 2,
                      boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)',
                      border: '1px solid rgba(0, 0, 0, 0.06)',
                      mt: 1,
                      '& .MuiList-root': {
                        padding: '8px',
                      },
                    },
                  },
                }}
                sx={{
                  borderRadius: 1.5,
                  '& .MuiSelect-select': {
                    p: 0.5,
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                }}
              >
                {/* {versionOptions
                  .filter((option, index) => {
                    const mode = (option?.generationParams as any)?.mode;
                    const hasManualEdits =
                      Array.isArray(option?.manualEdits) && option.manualEdits.length > 0;
                    const isLatest = index === versionOptions.length - 1;

                    if (mode !== 'copy') return true;
                    return isLatest || hasManualEdits;
                  }) */}
                 {filteredVersions.map((version, index) => {
                    //{versionOptions.map((version, index) => {
                    const genParams = version.generationParams as unknown as GenerationParams;
                    const mode = genParams?.mode;
                    const variantOptions = (genParams as any)?.variantOptions;
                    const variantType = variantOptions ? variantOptions?.variantType : '';
                    const theme = variantOptions ? variantOptions?.theme : '';
                    const meVersion = version?.manualEdits?.length ?? 0;
                    const isLatest = index + 1 === filteredVersions.length;
                    // versionOptions.filter((option, index) => {
                    //   const mode = (option?.generationParams as any)?.mode;
                    //   const hasManualEdits =
                    //     Array.isArray(option?.manualEdits) && option.manualEdits.length > 0;
                    //   const isLatest = index === versionOptions.length - 1;

                    //   if (mode !== 'copy') return true;
                    //   return isLatest || hasManualEdits;
                    // }).length;
                    let modeLabel = 'Existing';
                    const problemId = version?.problemId;
                    if (mode === 'copy') modeLabel = 'Copied';
                    else if (mode === 'variant') modeLabel = 'Variant';
                    else if (mode === 'new') modeLabel = 'Generated';
                    if (variantType) modeLabel += ` (${variantType})`;
                    if (meVersion > 0) modeLabel += ` ME${meVersion}`;

                    const formattedDate =
                      meVersion > 0
                        ? new Date(version.manualEdits[meVersion - 1].updatedAt).toLocaleString()
                        : new Date(version.updatedAt).toLocaleString();
                    return (
                      <MenuItem
                        key={index}
                        value={index}
                        sx={{
                          borderRadius: 2,
                          mx: 1,
                          my: 0.5,
                          p: 0,
                          backgroundColor: 'transparent',
                          border: '1px solid transparent',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          overflow: 'hidden',
                          position: 'relative',

                          '&:hover': {
                            backgroundColor: 'rgba(25, 118, 210, 0.04)',
                            border: '1px solid rgba(25, 118, 210, 0.2)',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                          },

                          '&.Mui-selected': {
                            backgroundColor: 'rgba(25, 118, 210, 0.08)',
                            border: '1px solid rgba(25, 118, 210, 0.3)',

                            '&:hover': {
                              backgroundColor: 'rgba(25, 118, 210, 0.12)',
                            },

                            '&::after': {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: 3,
                              backgroundColor: '#1976d2',
                            },
                          },
                        }}
                      >
                        <Tooltip title={theme}>
                          <Box
                            sx={{
                              p: 1,
                              width: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 0.25,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 500,
                                color: 'text.primary',
                                fontSize: '0.875rem',
                              }}
                            >
                              {index + 1}. {modeLabel} {`Id:${problemId}`}{isLatest ? '(Latest)' : ''}
                            </Typography>

                            {formattedDate && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.secondary',
                                  fontSize: '0.75rem',
                                }}
                              >
                                {formattedDate}
                              </Typography>
                            )}
                          </Box>
                        </Tooltip>
                      </MenuItem>
                    );
                  })}
              </Select>
            </FormControl>
            <Tooltip title={'See All the versions'}>
              <TuneIcon
                onClick={() => setShowVersionTrack((prev) => !prev)}
                sx={{
                  cursor: 'pointer',
                  color: showVersionTrack ? 'primary.main' : 'action.active',
                  transition: 'color 0.2s',
                  '&:hover': {
                    color: 'primary.dark',
                  },
                }}
              />
            </Tooltip>
          </Box>
        )}

        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" color="text.secondary">
            Rendered
          </Typography>
          <Switch
            checked={previewMode === 'stex'}
            onChange={(e) => setPreviewMode(e.target.checked ? 'stex' : 'json')}
            disabled={isModified || manualEditPresentInVersion}
          />
          <Typography variant="body2" color="text.secondary">
            Source
          </Typography>
          {(isModified || manualEditPresentInVersion) && (
            <Tooltip
              title={
                isModified
                  ? 'Manual changes detected in STeX source.'
                  : manualEditPresentInVersion
                  ? 'Switch disabled for manually Edited problems.'
                  : ''
              }
            >
              <InfoIcon color="warning" fontSize="small" />
            </Tooltip>
          )}
        </Box>
      </Box>

      {showVersionTrack && versionOptions.length > 0 && (
        <Box p={2} bgcolor="grey.50" borderBottom="1px solid" borderColor="divider" flexShrink={0}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="body2" color="text.primary" fontWeight={600}>
              Available Versions
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {versionOptions.length} version{versionOptions.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              overflowX: 'auto',
              pb: 1,
            }}
          >
            {versionOptions.map((version, index) => (
              <Box
                key={index}
                onClick={() => setSelectedVersionIndex(index)}
                sx={{
                  cursor: 'pointer',
                  flexShrink: 0,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                  },
                  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <VersionLeadNode index={index} isSelected={selectedVersionIndex === index} />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box
        flex={1}
        bgcolor="background.default"
        border="2px dashed"
        borderColor="divider"
        borderRadius={2}
        p={2}
        overflow="auto"
        position="relative"
      >
        {previewMode === 'json' ? (
          problemData ? (
            selectedVersion?.problemUri ? (
              <UriProblemViewer uri={selectedVersion?.problemUri} />
            ) : (
              <QuizProblemViewer problemData={selectedVersion ?? problemData} />
            )
          ) : (
            <Box
              sx={{
                textAlign: 'center',
                color: 'text.secondary',
                mt: 4,
                opacity: 0.7,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 400 }}>
                📄 No problem data available
              </Typography>
              <Typography variant="body2">Select a question variant to see its preview</Typography>
            </Box>
          )
        ) : (
          <TextField
            fullWidth
            multiline
            value={editableSTeX}
            onChange={(e) => setEditableSTeX(e.target.value)}
            variant="outlined"
            InputProps={{
              readOnly: !isLatestVersion,
              sx: {
                '& textarea': {
                  userSelect: isLatestVersion ? 'text' : 'none',
                  pointerEvents: isLatestVersion ? 'auto' : 'none',
                },
              },
            }}
            sx={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              color: isLatestVersion ? '#111827' : 'text.secondary',
              backgroundColor: isLatestVersion ? '#fff' : '#f9f9f9',
              minHeight: '300px',
              cursor: isLatestVersion ? 'text' : 'not-allowed',
              userSelect: isLatestVersion ? 'text' : 'none',
            }}
          />
        )}
      </Box>
    </Box>
  );
};
