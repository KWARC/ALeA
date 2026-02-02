import { Box, Paper, Typography } from '@mui/material';
import { CommentNoteToggleView } from '@alea/comments';

export default function NotesAndCommentsSection({ currentSlideUri }: { currentSlideUri: string }) {
  return (
    <Paper
      elevation={1}
      sx={{
        mt: { xs: 2, sm: 3 },
        borderRadius: 2,
        bgcolor: 'background.paper',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          borderBottom: '1px solid #e5e5e5',
          bgcolor: 'blue.100'
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
            color: 'blue.sky',
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
