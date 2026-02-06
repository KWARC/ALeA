import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import TextsmsIcon from '@mui/icons-material/Textsms';
import { Box, Switch, Paper, Fade } from '@mui/material';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { FTML } from '@flexiformal/ftml';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { EditView } from './EditView';
import styles from './comments.module.scss';
import { getLocaleObject } from './lang/utils';
import { SelectedInfo } from './selected-info';
import { useCurrentUser } from '@alea/react-utils';

interface CommentReplyProps {
  uri?: FTML.Uri;
  isPrivateNote: boolean;
  parentId?: number;
  placeholder?: string;
  selectedText?: string;
  selectedElement?: any;
  hidden?: boolean;
  onCancel?: () => void;
  onUpdate: () => void;
}

export function CommentReply({
  uri,
  isPrivateNote,
  parentId = 0,
  placeholder = '',
  selectedText = undefined,
  selectedElement = undefined,
  hidden = false,
  onCancel,
  onUpdate,
}: CommentReplyProps) {
  const t = getLocaleObject(useRouter());
  const { user } = useCurrentUser();
  const name = user?.fullName || '';

  const [postAnonymously, setPostAnonymously] = useState(false);

  const commentHeader = !isPrivateNote ? (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 2,
      }}
    >
      <Box>
        <Box
          sx={{
            fontSize: 15,
            fontWeight: 600,
            color: 'text.primary',
            lineHeight: 1.3,
          }}
        >
          {postAnonymously ? t.anonymous : name || 'Loading...'}
        </Box>
        <Box
          sx={{
            fontSize: 12,
            color: 'text.secondary',
            mt: 0.3,
          }}
        >
          {postAnonymously ? 'Your identity is hidden' : 'Posting as yourself'}
        </Box>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.8,
          borderRadius: 2,
          bgcolor: postAnonymously ? 'grey.100' : 'transparent',
          transition: 'all 0.2s ease',
        }}
      >
        <VisibilityOffIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Box sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary' }}>{t.hideIdentity}</Box>
        <Switch
          size="small"
          checked={postAnonymously}
          onChange={(e) => setPostAnonymously(e.target.checked)}
          sx={{
            ml: 0.5,
            '& .MuiSwitch-switchBase.Mui-checked': {
              color: 'primary.main',
            },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              bgcolor: 'primary.100',
            },
          }}
        />
      </Box>
    </Box>
  ) : null;

  return (
    <Fade in timeout={400}>
      <Paper
        elevation={0}
        className={styles.replyPaper}
        style={{ display: hidden ? 'none' : 'block' }}
      >
        <Box className={styles.replyContainer}>
          <Box className={styles.replyIconBox}>
            {isPrivateNote ? (
              <TextSnippetIcon className={styles.replyIcon} />
            ) : (
              <TextsmsIcon className={styles.replyIcon} />
            )}
          </Box>

          <Box className={styles.replyContent}>
            {commentHeader}

            {selectedText && (
              <Box className={styles.selectedTextBox}>
                <SelectedInfo text={selectedText} />
              </Box>
            )}

            <Box className={styles.replyEditorWrapper}>
              <EditView
                parentId={parentId}
                uri={uri}
                isPrivateNote={isPrivateNote}
                postAnonymously={postAnonymously}
                selectedText={selectedText}
                placeholder={placeholder}
                onCancel={onCancel}
                onUpdate={onUpdate}
              />
            </Box>
          </Box>
        </Box>
      </Paper>
    </Fade>
  );
}
