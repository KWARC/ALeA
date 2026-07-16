import { FTML } from '@flexiformal/ftml';
import { Refresh } from '@mui/icons-material';
import { Box, IconButton, Link, Typography, useTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { Comment } from '@alea/spec';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getPrivateNotes, refreshAllComments } from './comment-store-manager';
import { CommentReply } from './CommentReply';
import { CommentView } from './CommentView';
import { getLocaleObject } from './lang/utils';
import { useCommentRefresh, useCurrentUser } from '@alea/react-utils';

export function NotesView({
  uri,
  selectedText = undefined,
  selectedElement = undefined,
  allNotesMode = false,
  searchQuery = '',
  courseId = '',
  courseTerm = '',
}: {
  uri: FTML.Uri;
  selectedText?: string;
  selectedElement?: any;
  allNotesMode?: boolean;
  searchQuery?: string;
  courseId?: string;
  courseTerm?: string;
}) {
  const t = getLocaleObject(useRouter());
  const theme = useTheme();
  const [notes, setNotes] = useState([] as Comment[]);
  const { refreshKey } = useCommentRefresh();
  const { user } = useCurrentUser();
  const userId = user?.userId;

  const refreshNotes = () => {
    refreshAllComments().then((_) => {
      getPrivateNotes(uri).then((c) => setNotes(c));
    });
  };

  useEffect(() => {
    if (!userId) return;
    getPrivateNotes(uri).then((c) => setNotes(c));
  }, [uri, userId, refreshKey]);
  const filteredNotes = notes.filter(
    (note) =>
      (courseId === '' || note.courseId === courseId) &&
      (courseTerm === '' || note.courseTerm === courseTerm) &&
      (searchQuery === '' ||
        (note.statement && note.statement.toLowerCase().includes(searchQuery.toLowerCase())))
  );
  if (searchQuery !== '' && filteredNotes.length === 0) return null;

  if (!userId)
    return (
      <Box m={1.25}>
        <i>
          <Link
            href={'/login?target=' + encodeURIComponent(window.location.href)}
            sx={notesViewStyles.loginLink}
          >
            <b>{t.loginForNotes}</b>
          </Link>
        </i>
      </Box>
    );

  return (
    <Box className="alea-note-card" sx={notesViewStyles.card(theme)}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="body2" sx={notesViewStyles.countLabel}>
          {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}{' '}
        </Typography>
        <IconButton
          onClick={() => refreshNotes()}
          size="small"
          sx={{ color: 'text.secondary', bgcolor: 'action.hover' }}
        >
          <Refresh fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 3 }} />
      {!allNotesMode && (
        <CommentReply
          placeholder={t.createPrivate}
          parentId={0}
          uri={uri}
          isPrivateNote={true}
          selectedText={selectedText}
          selectedElement={selectedElement}
          onUpdate={() => refreshNotes()}
          onCancel={undefined}
        />
      )}

      {filteredNotes.map((note) => (
        <CommentView key={note.commentId} comment={note} onUpdate={() => refreshNotes()} />
      ))}
    </Box>
  );
}

const notesViewStyles = {
  card: (theme: Theme) => ({
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 4,
    p: 3,
    mb: 3,
    boxShadow: theme.shadows[2],
    bgcolor: 'background.paper',
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[4],
    },
  }),
  countLabel: {
    color: 'text.secondary',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  divider: {
    borderBottom: '1px solid',
    borderColor: 'divider',
    mb: 3,
  },
  loginLink: {
    textDecoration: 'underline',
  },
};
