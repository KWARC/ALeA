import InfoIcon from '@mui/icons-material/Info';
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
}: PreviewSectionProps) => {
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const versionOptions = useMemo(() => previousVersions ?? [], [previousVersions]);
  const selectedVersion = versionOptions[selectedVersionIndex];
  const latestManualEdit = selectedVersion?.manualEdits?.[selectedVersion.manualEdits.length - 1];
  const manualEditPresentInVersion =
    Array.isArray(selectedVersion?.manualEdits) && selectedVersion?.manualEdits.length > 0;
  const isModified = useMemo(() => {
    const original = problemData?.problemStex;
    return editableSTeX !== original;
  }, [editableSTeX, problemData]);

  useEffect(() => {
    if (versionOptions.length > 0) {
      setSelectedVersionIndex(versionOptions.length - 1);
    }
  }, [versionOptions]);

  useEffect(() => {
    setPreviewMode(isModified || manualEditPresentInVersion ? 'stex' : 'json');
  }, [isModified, manualEditPresentInVersion]);

  useEffect(() => {
    if (manualEditPresentInVersion && latestManualEdit) {
      setEditableSTeX(latestManualEdit);
    } else {
      setEditableSTeX(selectedVersion?.problemStex);
    }
  }, [manualEditPresentInVersion, latestManualEdit]);

  useEffect(() => {
    console.log('Selected version data:', selectedVersion);
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
        mb={1}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          Preview
        </Typography>
        {versionOptions.length > 0 && (
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
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
              }}
            >
              {versionOptions.map((version, index) => {
                const genParams = version.generationParams as unknown as GenerationParams;
                const mode = genParams?.mode;

                let modeLabel = 'Manual';
                if (mode === 'copy') modeLabel = 'Copied';
                else if (mode === 'variant') modeLabel = 'Variant';
                else if (mode === 'new') modeLabel = 'Generated';

                return (
                  <MenuItem
                    key={index}
                    value={index}
                    sx={{
                      borderRadius: 1,
                      mx: 1,
                      my: 0.25,
                      py: 1.25,
                      px: 2,
                      backgroundColor: 'transparent !important',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.08) !important',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(25, 118, 210, 0.12) !important',
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.16) !important',
                        },
                      },
                    }}
                  >
                    {index + 1} - {modeLabel}{' '}
                    {index + 1 === versionOptions.length ? '(Latest)' : ''}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
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

      {versionOptions.length > 0 && (
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
            <QuizProblemViewer problemData={selectedVersion ?? problemData} />
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
            sx={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              color: '#111827',
              backgroundColor: '#fff',
              minHeight: '300px',
            }}
          />
        )}
      </Box>
    </Box>
  );
};
