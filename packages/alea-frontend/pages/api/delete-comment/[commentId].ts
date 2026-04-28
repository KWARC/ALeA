import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeTxnAndEndSet500OnError,
  getExistingCommentDontEnd,
  getUserIdOrSetError,
} from '../comment-utils';

export default async function handler(req, res) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const commentId = +req.query.commentId;
  if (!commentId) {
    res.status(404).json({ message: 'Invalid comment id' });
    return;
  }

  const { institutionId } = req.body;
  if (!institutionId) {
    return res.status(422).end('Missing institutionId');
  }

  const existing = await executeAndEndSet500OnError(
    `SELECT userId FROM comments WHERE commentId=? AND institutionId=?`,
    [commentId, institutionId],
    res
  );
  if (!existing) return;

  const ownerId = existing[0]?.userId;
  if (!ownerId || userId !== ownerId) {
    return res.status(403).json({ message: 'User not authorized' });
  }

  const commentUpdate = await executeTxnAndEndSet500OnError(
    res,
    `UPDATE comments
    SET statement=NULL, userId=NULL, userName=NULL, userEmail=NULL, selectedText=NULL, isDeleted=1
    WHERE commentId=? AND institutionId=?`,
    [commentId, institutionId],
    `DELETE FROM updateHistory WHERE commentId=?`,
    [commentId],
    `DELETE FROM points WHERE commentId=?`,
    [commentId]
  );
  if (!commentUpdate) return;
  res.status(204).end();
}
