import AddCommentIcon from '@mui/icons-material/AddComment';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import { Box, Button, Dialog, DialogActions, IconButton, Tooltip } from '@mui/material';
import { Comment } from '@alea/spec';
import { MdViewer } from '@alea/markdown';
import { useCommentRefresh } from '@alea/react-utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getTotalComments } from './comment-helpers';
import { CommentNoteToggleView } from './comment-note-toggle-view';
import { getPrivateNotes, getPublicCommentTrees } from './comment-store-manager';
import { getLocaleObject } from './lang/utils';

function buttonProps(backgroundColor: string) {
  return {
    zIndex: '1',
    color: 'grey',
    backgroundColor,
    mb: '3px',
    '&:hover': {
      backgroundColor,
      boxShadow: '#0005 0px 3px 7px',
    },
  };
}

export function NotesIcon({ numNotes }: { numNotes: number }) {
  return (
    <span>
      <FormatListBulletedIcon sx={{ color: 'white' }} fontSize="small" />
      <span
        style={{
          color: '#4d97dd',
          fontSize: '10px',
          position: 'absolute',
          background: 'white',
          borderRadius: '20px',
          padding: '1px',
          top: '-2px',
          right: '-4px',
        }}
      >
        {numNotes < 10 ? <>&nbsp;{numNotes}&nbsp;</> : numNotes}
      </span>
    </span>
  );
}

export function CommentsIcon({ numComments }: { numComments: number }) {
  return (
    <span style={{ display: 'inline-flex' }}>
      <ChatBubbleIcon sx={{ color: 'white' }} fontSize="small" />
      <span
        style={{
          color: '#4d97dd',
          fontSize: '10px',
          position: 'absolute',
          top: '3px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'max-content',
        }}
      >
        {numComments}
      </span>
    </span>
  );
}

export function CommentButton({ url = '', fragmentKind }: { url?: string; fragmentKind?: string }) {
  const [numPublicComments, setNumPublicComments] = useState(0);
  const [numPrivateNotes, setNumPrivateNotes] = useState(0);
  const [open, setOpen] = useState(false);
  const [defaultPrivate, setDefaultPrivate] = useState(true);
  const [topComment, setTopComment] = useState<Comment | undefined>(undefined);
  const [topNote, setTopNote] = useState<Comment | undefined>(undefined);
  const t = getLocaleObject(useRouter());
  const { refreshKey } = useCommentRefresh();

  useEffect(() => {
    if (!url) {
      setNumPublicComments(0);
      return;
    }
    getPublicCommentTrees(url).then((comments) => {
      setNumPublicComments(getTotalComments(comments));
      setTopComment(comments?.[0]);
    });
    getPrivateNotes(url).then((comments) => {
      setNumPrivateNotes(getTotalComments(comments));
      setTopNote(comments?.[0]);
    });
  }, [url, open, refreshKey]);

  if (!url) return null;
  if (!numPrivateNotes && !numPublicComments) return null;

  return (
    <Box>
      {numPrivateNotes > 0 && (
        <Tooltip
          title={
            <Box>
              <MdViewer content={topNote?.statement || ''} />
              {numPrivateNotes > 1 ? '..and more' : ''}
            </Box>
          }
          placement="left-start"
        >
          <IconButton
            onClick={() => {
              setDefaultPrivate(true);
              setOpen(true);
            }}
            sx={buttonProps('#4d97dd')}
          >
            <NotesIcon numNotes={numPrivateNotes} />
          </IconButton>
        </Tooltip>
      )}
      {(!numPrivateNotes || numPublicComments > 0) && (
        <Tooltip
          title={
            numPublicComments > 0 ? (
              <Box>
                <b>{topComment?.userName}</b>&nbsp;<i>says:</i>
                <MdViewer content={topComment?.statement || ''} />
                {numPublicComments > 1 ? t.andMore : ''}
              </Box>
            ) : (
              <span>
                {fragmentKind === 'Slide' ? t.addToSlide : t.addToParagraph}
                <br />
                {t.selectionSuggestion}
              </span>
            )
          }
          placement="left-start"
        >
          <IconButton
            onClick={() => {
              setDefaultPrivate(false);
              setOpen(true);
            }}
            sx={buttonProps(numPublicComments > 0 ? '#4d97dd' : 'white')}
          >
            {numPublicComments > 0 ? (
              <CommentsIcon numComments={numPublicComments} />
            ) : (
              <AddCommentIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      )}
      {open && (
        <Dialog onClose={() => setOpen(false)} open={open} maxWidth="lg">
          <CommentNoteToggleView defaultPrivate={defaultPrivate} uri={url} />
          <DialogActions sx={{ p: '0' }}>
            <Button onClick={() => setOpen(false)}>{t.close}</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
