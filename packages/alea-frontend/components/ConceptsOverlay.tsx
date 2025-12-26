import { getParamFromUri, PathToTour2 } from '@alea/utils';
import { Box, CircularProgress, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Image from 'next/image';
import Link from 'next/link';

interface ConceptsOverlayProps {
  showConcepts: boolean;
  loadingConcepts: boolean;
  conceptsUri: string[];
  overlay: { title: string; description: string } | null;
  onClose: () => void;
  sectionTitle?: string;
}

export function ConceptsOverlay({
  showConcepts,
  loadingConcepts,
  conceptsUri,
  overlay,
  onClose,
  sectionTitle
}: ConceptsOverlayProps) {
  if (!showConcepts || !overlay) return null;

  return (
    <Paper
      elevation={4}
      sx={{
        mt: 2,
        p: 2,
        borderRadius: 3,
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        color: 'white',
        maxHeight: 260,
        overflowY: 'auto',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}
        >
          Concepts in {sectionTitle}
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            backgroundColor: 'rgba(148, 163, 184, 0.4)',
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(248, 113, 113, 0.9)',
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {loadingConcepts ? (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <CircularProgress color="primary" />
          <Typography variant="body2" color="white" mt={1}>
            Loading concepts...
          </Typography>
        </Box>
      ) : conceptsUri && conceptsUri.length > 0 ? (
        <Box display="flex" flexDirection="column" gap={1}>
          {conceptsUri.map((uri, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 1.5,
                py: 1,
                borderRadius: 2,
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(148, 163, 184, 0.5)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 20px rgba(15,23,42,0.7)',
                  borderColor: 'rgba(96, 165, 250, 0.9)',
                },
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  whiteSpace: 'normal',
                  wordWrap: 'break-word',
                  pr: 1,
                }}
                title={uri}
              >
                {getParamFromUri(uri, 's') ?? uri}
              </Typography>
              <Link href={PathToTour2(uri)} target="_blank" style={{ textDecoration: 'none' }}>
                <Tooltip title="Take a guided tour" arrow>
                  <IconButton
                    sx={{
                      backgroundColor: '#ffffff',
                      borderRadius: '50%',
                      padding: '2px',
                      '&:hover': {
                        backgroundColor: '#e5e7eb',
                        transform: 'scale(1.05)',
                        transition: 'transform 0.15s ease-in-out',
                      },
                    }}
                  >
                    <Image src="/guidedTour.png" alt="Tour Logo" width={22} height={22} priority />
                  </IconButton>
                </Tooltip>
              </Link>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography
          variant="body2"
          sx={{
            textAlign: 'center',
            fontWeight: 500,
            color: '#e5e7eb',
            mt: 1,
          }}
        >
          No new concepts defined in this section
        </Typography>
      )}
    </Paper>
  );
}
