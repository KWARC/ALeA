import { Box, Paper, Typography } from '@mui/material';
import { CommentNoteToggleView } from '@alea/comments';

interface NotesAndCommentsSectionProps {
  currentSlideUri: string;
}

export default function NotesAndCommentsSection({
  currentSlideUri,
}: NotesAndCommentsSectionProps) {
  return (
    <Paper
      elevation={1}
      sx={{
        mt: { xs: 2, sm: 3 },
        borderRadius: 2,
        bgcolor: 'white',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          borderBottom: '1px solid #e5e5e5',
          background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: '#1a1a1a',
            fontSize: { xs: '1rem', sm: '1.125rem' },
            mb: 0.5,
          }}
        >
          Notes & Comments
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: '#1976d2',
            fontSize: { xs: '0.813rem', sm: '0.875rem' },
            fontWeight: 500,
          }}
        >
          Your private notes and public comments for this slide.
        </Typography>
      </Box>
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <CommentNoteToggleView uri={currentSlideUri} defaultPrivate={true} />
      </Box>
    </Paper>
  );
}

