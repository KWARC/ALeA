import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCode = styled('code')(({ theme }) => ({
  backgroundColor: theme.palette.grey[200],
  padding: '2px 6px',
  borderRadius: theme.shape.borderRadius * 0.5,
  fontFamily: 'monospace',
  fontSize: '0.9em',
}));

interface ParameterizationInfoDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ParameterizationInfoDialog({ open, onClose }: ParameterizationInfoDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Supported Parameterization</DialogTitle>
      <Box sx={{ px: 3, pt: 0, pb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          FTML URIs are converted to SPARQL IRIs before substitution
        </Typography>
      </Box>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
              1. Single URI Parameters
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              Use <StyledCode>{'<_uri_paramName>'}</StyledCode> or{' '}
              <StyledCode>{'"_uri_paramName"'}</StyledCode> to insert a single URI value.
            </Typography>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
                mb: 1,
                backgroundColor: 'grey.50',
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Example query: <StyledCode>{'SELECT ?x WHERE { ?x <_uri_concept> }'}</StyledCode>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                With parameter:{' '}
                <StyledCode>
                  {'{ _uri_concept: "http://example.org/concept with spaces" }'}
                </StyledCode>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Result:{' '}
                <StyledCode>
                  {'SELECT ?x WHERE { ?x <http://example.org/concept%20with%20spaces> }'}
                </StyledCode>
              </Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
              2. Multiple URI Parameters
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              Use <StyledCode>{'<_multiuri_paramName>'}</StyledCode> to insert multiple URIs.
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Provide an array of strings, which will be replaced with space-separated URIs in the
              final query.
            </Typography>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
                mb: 1,
                backgroundColor: 'grey.50',
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Example query: <StyledCode>{'VALUES ?uri { <_multiuri_sections> }'}</StyledCode>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                With parameter:{' '}
                <StyledCode>{'{ _multiuri_sections: ["uri1", "uri2", "uri3"] }'}</StyledCode>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Result: <StyledCode>{'VALUES ?uri { <uri1> <uri2> <uri3> }'}</StyledCode>
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
