import { ReopenQuestionRequest, CommentType, QuestionStatus } from '@alea/spec';
import {
  checkIfPostOrSetError,
  executeTxnAndEndSet500OnError,
  getExistingCommentDontEnd,
  getUserIdOrSetError,
} from './comment-utils';
import { canUserModerateComments } from './access-control/resource-utils';

export default async function handler(req, res) {
  if (!checkIfPostOrSetError(req, res)) return;

  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const { commentId } = req.body as ReopenQuestionRequest;

  if (!commentId) {
    res.status(401).json({ message: 'Invalid comment id' });
    return;
  }

  const { existing, error } = await getExistingCommentDontEnd(commentId);

  if (!existing || existing.isPrivate) {
    res.status(error || 404).json({ message: 'Comment not found' });
    return;
  }

  const isOwner = existing.userId === userId;
  const isModerator = await canUserModerateComments(userId, existing.courseId, existing.courseTerm);

  console.log('DEBUG REOPEN', {
    userId,
    existingUserId: existing.userId,
    courseId: existing.courseId,
    courseTerm: existing.courseTerm,
  });

  if (!isOwner && !isModerator) {
    res.status(403).json({ message: 'Unauthorized' });
    return;
  }

  if (
    existing.commentType !== CommentType.QUESTION ||
    existing.questionStatus !== QuestionStatus.ANSWERED
  ) {
    res.status(400).json({ message: 'This comment cannot be reopened' });
    return;
  }

  const results = await executeTxnAndEndSet500OnError(
    res,
    'UPDATE comments SET questionStatus=?, commentType=? WHERE commentId=?',
    [QuestionStatus.UNANSWERED, CommentType.QUESTION, commentId],
    `INSERT INTO updateHistory
      (commentId, ownerId, updaterId, previousStatement, previousHiddenStatus, previousHiddenJustification, previousQuestionStatus)
      VALUES(?, ?, ?, ?, ?, ?, ?)`,
    [
      commentId,
      existing.userId,
      userId,
      existing.statement,
      existing.hiddenStatus,
      existing.hiddenJustification,
      existing.questionStatus,
    ]
  );

  if (!results) return;

  res.status(204).end();
}
