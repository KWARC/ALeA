import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import TextsmsIcon from '@mui/icons-material/Textsms';
import { Box, Checkbox, FormControlLabel } from '@mui/material';
import { getUserInfo } from '@alea/spec';
import { FTML } from '@flexiformal/ftml';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { EditView } from './EditView';
import styles from './comments.module.scss';
import { getLocaleObject } from './lang/utils';
import { SelectedInfo } from './selected-info';

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
  const [name, setName] = useState<string | undefined>(undefined);

  useEffect(() => {
    getUserInfo().then((userInfo) => {
      setName(userInfo?.fullName);
    });
  }, []);

  const [postAnonymously, setPostAnonymously] = useState(false);

  const commentHeader = !isPrivateNote ? (
    <>
      <span className={styles['user_link']} style={{ marginRight: '20px' }}>
        {postAnonymously ? <i>{t.anonymous}</i> : name}
      </span>
      <FormControlLabel
        control={
          <Checkbox
            sx={{ p: 0 }}
            checked={postAnonymously}
            onChange={(e) => setPostAnonymously(e.target.checked)}
          />
        }
        label={t.hideIdentity}
      />
    </>
  ) : null;

  return (
    <Box hidden={hidden} display={hidden ? 'none' : 'flex'} alignItems="stretch">
      {isPrivateNote ? (
        <TextSnippetIcon fontSize="large" color="secondary" />
      ) : (
        <TextsmsIcon fontSize="large" color="secondary" />
      )}
      <div className={styles['stretchy_div']}>
        {commentHeader}
        <SelectedInfo text={selectedText} />
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
      </div>
    </Box>
  );
}
