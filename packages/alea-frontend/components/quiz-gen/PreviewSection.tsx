import { Box, Switch, TextField, Tooltip, Typography } from '@mui/material';
import { UriProblemViewer } from '@stex-react/stex-react-renderer';
import { ExistingProblem, FlatQuizProblem, isExisting, isGenerated } from '../../pages/quiz-gen';
import { QuizProblemViewer } from '../GenerateQuiz';
import InfoIcon from '@mui/icons-material/Info';
import { useEffect, useMemo } from 'react';

interface PreviewSectionProps {
  previewMode: 'json' | 'stex';
  setPreviewMode: (mode: 'json' | 'stex') => void;
  problemData?: FlatQuizProblem;
  editableSTeX: string;
  setEditableSTeX: (stex: string) => void;
}

export const PreviewSection = ({
  previewMode,
  setPreviewMode,
  problemData,
  editableSTeX,
  setEditableSTeX,
}: PreviewSectionProps) => {
  const isModified = useMemo(() => {
    const original = problemData?.problemStex;
    return editableSTeX !== original;
  }, [editableSTeX, problemData]);

  useEffect(() => {
    setPreviewMode(isModified ? 'stex' : 'json');
  }, [isModified]);

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

        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" color="text.secondary">
            Rendered
          </Typography>
          <Switch
            checked={previewMode === 'stex'}
            onChange={(e) => setPreviewMode(e.target.checked ? 'stex' : 'json')}
            disabled={isModified}
          />
          <Typography variant="body2" color="text.secondary">
            Source
          </Typography>
          {isModified && (
            <Tooltip title="Manual changes detected in STeX source.">
              <InfoIcon color="warning" fontSize="small" />
            </Tooltip>
          )}
        </Box>
      </Box>

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
            <QuizProblemViewer problemData={problemData} />
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
