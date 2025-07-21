import { Edit, Save } from '@mui/icons-material';
import { Box, IconButton, Switch, TextField, Typography } from '@mui/material';
import { UriProblemViewer } from '@stex-react/stex-react-renderer';
import { ExistingProblem, FlatQuizProblem, isExisting, isGenerated } from '../../pages/quiz-gen';
import { QuizProblemViewer } from '../GenerateQuiz';

interface PreviewSectionProps {
  previewMode: 'json' | 'stex';
  setPreviewMode: (mode: 'json' | 'stex') => void;
  problemData?: FlatQuizProblem | ExistingProblem;
  problemUri?: string;
  STeX?: string;
  editingSTeX: boolean;
  setEditingSTeX: (editing: boolean) => void;
  editableSTeX: string;
  setEditableSTeX: (stex: string) => void;
}

export const PreviewSection = ({
  previewMode,
  setPreviewMode,
  problemData,
  problemUri,
  STeX,
  editingSTeX,
  setEditingSTeX,
  editableSTeX,
  setEditableSTeX,
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
          minHeight: 0,
        }}
      >
        {previewMode === 'json' ? (
          isGenerated(problemData) ? (
            <Box
              component="pre"
              sx={{
                width: '100%',
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: 1.6,
                m: 0,
              }}
            >
              <QuizProblemViewer problemData={problemData} />
            </Box>
          ) : isExisting(problemData) ? (
            <Box
              component="pre"
              sx={{
                width: '100%',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: 1.6,
                m: 0,
              }}
            >
              <UriProblemViewer uri={problemUri} />
            </Box>
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
        ) : editingSTeX ? (
          <Box sx={{ position: 'relative' }}>
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
            <IconButton
              onClick={() => setEditingSTeX(false)}
              sx={{ position: 'absolute', top: 8, right: 8 }}
              aria-label="Save"
            >
              <Save />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ position: 'relative' }}>
            <Typography
              variant="body2"
              component="pre"
              sx={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                color: '#111827',
                p: 1,
              }}
            >
              {STeX || 'No STeX available for this problem.'}
            </Typography>
            <IconButton
              onClick={() => setEditingSTeX(true)}
              sx={{ position: 'absolute', top: 8, right: 8 }}
              aria-label="Edit"
            >
              <Edit />
            </IconButton>
          </Box>
        )}
      </Box>
    </Box>
  );
};
