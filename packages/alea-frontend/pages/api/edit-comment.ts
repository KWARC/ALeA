import { EditCommentRequest } from '@stex-react/spec';
import {
  checkIfPostOrSetError,
  executeTxnAndEndSet500OnError,
  getExistingCommentDontEnd,
  getUserIdOrSetError,
} from './comment-utils';

export default async function handler(req, res) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const { commentId, statement } = req.body as EditCommentRequest;
  if (!commentId) {
    res.status(401).send({ message: 'Invalid comment id' });
    return;
  }

  const { existing, error } = await getExistingCommentDontEnd(commentId);
  const ownerId = existing?.userId;
  if (!ownerId || userId !== ownerId) {
    res.status(error || 403).json({ message: 'User not authorized' });
    return;
  }

  const commentUpdate = await executeTxnAndEndSet500OnError(
    res,
    'UPDATE comments SET statement=?, isEdited=1 WHERE commentId=?',
    [statement, commentId],
    `INSERT INTO updateHistory
    (commentId, ownerId, updaterId, previousStatement, previousHiddenStatus, previousHiddenJustification, previousQuestionStatus)
    VALUES(?, ?, ?, ?, ?, ?, ?)`,
    [
      commentId,
      ownerId,
      userId,
      existing.statement,
      existing.hiddenStatus,
      existing.hiddenJustification,
      existing.questionStatus
    ]
  );
  if (!commentUpdate) return;
  res.status(204).end();
}
