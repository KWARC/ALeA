import { Comment } from '@alea/spec';
import { useState } from 'react';
import { Box } from '@mui/material';
import { CommentLabel } from './CommentLabel';
import { CommentReply } from './CommentReply';
import { EditView } from './EditView';

import { MdViewer } from '@alea/markdown';
import { discardDraft } from './comment-helpers';
import styles from './comments.module.scss';
import { SelectedInfo } from './selected-info';

export function CommentView({ comment, onUpdate }: { comment: Comment; onUpdate: () => void }) {
  const [commentReplyOpen, setCommentReplyOpen] = useState(false);
  const [editingComment, setEditingComment] = useState(false);

  return (
    <Box sx={commentViewStyles.card}>
      <CommentLabel
        comment={comment}
        setEditingComment={setEditingComment}
        setOpenReply={setCommentReplyOpen}
        onUpdate={onUpdate}
      />
      <Box sx={{ display: 'flex' }}>
        <div className={styles['stretchy_div']}>
          {!comment.isDeleted && (
            <div>
              <SelectedInfo text={comment.selectedText} />
              {!editingComment && (
                <Box sx={{ mt: 1 }}>
                  <MdViewer content={comment.statement || ''} />
                </Box>
              )}
              <EditView
                uri={comment.uri}
                hidden={!editingComment}
                parentId={comment.commentId}
                isPrivateNote={!!comment.isPrivate}
                postAnonymously={comment.isAnonymous}
                existingComment={comment}
                onCancel={() => setEditingComment(false)}
                onUpdate={() => {
                  setEditingComment(false);
                  onUpdate && onUpdate();
                }}
              />
              <CommentReply
                uri={comment.uri}
                hidden={!commentReplyOpen}
                parentId={comment.commentId}
                isPrivateNote={!!comment.isPrivate}
                onCancel={() => {
                  setCommentReplyOpen(false);
                  discardDraft(comment.uri ?? '', comment.commentId);
                }}
                onUpdate={() => {
                  setCommentReplyOpen(false);
                  onUpdate && onUpdate();
                }}
              />
            </div>
          )}
        </div>
      </Box>
    </Box>
  );
}

const commentViewStyles = {
  card: {
    mb: 1,
    p: 0.5,
    bgcolor: 'background.default',
    borderRadius: 3,
    border: '1px solid',
    borderColor: 'divider',
    transition: 'background-color 0.2s',
    '&:hover': { bgcolor: 'action.hover' },
  },
};
