import { Box, CircularProgress, Switch, TextField, Typography } from '@mui/material';
import { UriProblemViewer } from '@stex-react/stex-react-renderer';
import { ExistingProblem, FlatQuizProblem, isExisting, isGenerated } from '../../pages/quiz-gen';
import { QuizProblemViewer } from '../GenerateQuiz';

interface PreviewSectionProps {
  previewMode: 'json' | 'stex';
  setPreviewMode: (mode: 'json' | 'stex') => void;
  problemData?: FlatQuizProblem | ExistingProblem;
  problemUri?: string;
  editableSTeX: string;
  setEditableSTeX: (stex: string) => void;
  loading?: boolean;
}

export const PreviewSection = ({
  previewMode,
  setPreviewMode,
  problemData,
  problemUri,
  editableSTeX,
  setEditableSTeX,
  loading = false,
}: PreviewSectionProps) => {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          p: 2,
          bgcolor: 'grey.50',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          mb: 1,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Preview
        </Typography>

        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" color="text.secondary">
            Rendered
          </Typography>
          <Switch
            checked={previewMode === 'stex'}
            onChange={(e) => setPreviewMode(e.target.checked ? 'stex' : 'json')}
          />
          <Typography variant="body2" color="text.secondary">
            Source
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          bgcolor: '#f8f9fa',
          border: '2px dashed #ccc',
          borderRadius: 2,
          p: 2,
          overflow: 'auto',
        }}
      >
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(255,255,255,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <CircularProgress />
          </Box>
        )}
        {previewMode === 'json' ? (
          isGenerated(problemData) ? (
            <QuizProblemViewer problemData={problemData} />
          ) : isExisting(problemData) ? (
            <UriProblemViewer uri={problemUri} />
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
            minRows={6}
            maxRows={30}
            value={editableSTeX}
            onChange={(e) => setEditableSTeX(e.target.value)}
            variant="outlined"
            sx={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              color: '#111827',
              backgroundColor: '#fff',
            }}
          />
        )}
      </Box>
    </Box>
  );
};
