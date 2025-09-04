import { Comment } from '@stex-react/spec';
import { useState } from 'react';
import { CommentLabel } from './CommentLabel';
import { CommentReply } from './CommentReply';
import { EditView } from './EditView';

import { MystViewer } from '@stex-react/myst';
import { discardDraft } from './comment-helpers';
import styles from './comments.module.scss';
import { SelectedInfo } from './selected-info';

export function CommentView({ comment, onUpdate }: { comment: Comment; onUpdate: () => void }) {
  const [commentReplyOpen, setCommentReplyOpen] = useState(false);
  const [editingComment, setEditingComment] = useState(false);

  return (
    <>
      <CommentLabel
        comment={comment}
        setEditingComment={setEditingComment}
        setOpenReply={setCommentReplyOpen}
        onUpdate={onUpdate}
      />
      <div style={{ display: 'flex' }}>
        <div className={styles['stretchy_div']}>
          {!comment.isDeleted && (
            <div>
              <SelectedInfo text={comment.selectedText} />
              {!editingComment && (
                <div style={{ margin: '-1em 0 0' }}>
                  <MystViewer content={comment.statement || ''} />
                </div>
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
      </div>
    </>
  );
}
