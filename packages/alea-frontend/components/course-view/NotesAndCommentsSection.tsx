import { Box, Paper, Typography } from '@mui/material';
import { CommentNoteToggleView } from '@alea/comments';
import  shadows from '../../theme/shadows';

export default function NotesAndCommentsSection({ currentSlideUri }: { currentSlideUri: string }) {
  return (
    <Paper
      elevation={1}
      sx={{
        mt: { xs: 2, sm: 3 },
        borderRadius: 2,
        bgcolor: 'background.paper',
        overflow: 'hidden',
        boxShadow: shadows[1],
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          borderBottom: '1px solid ',
          borderBottomColor: 'divider',
          bgcolor: 'blue.100'
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: 'primary.900',
            fontSize: { xs: 16, sm: 18 },
            mb: 0.5,
          }}
        >
          Notes & Comments
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'blue.sky',
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
