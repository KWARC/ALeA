import { GrantPointsRequest } from '@stex-react/spec';
import { NextApiRequest, NextApiResponse } from 'next';
import { canUserModerateComments as canUserModerateComments } from './access-control/resource-utils';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getExistingCommentDontEnd,
  getExistingPointsDontEnd,
  getUserIdOrSetError,
} from './comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const granterId = await getUserIdOrSetError(req, res);
  if (!granterId) return;

  const { commentId, points, reason } = req.body as GrantPointsRequest;
  if (!commentId || !reason || points === undefined) {
    res.status(400).send({ message: 'Invalid comment id or reason or points' });
    return;
  }

  const { existing: comment, error: commentFetchError } = await getExistingCommentDontEnd(
    commentId
  );
  if (!(await canUserModerateComments(granterId, comment.courseId, comment.courseTerm))) {
    res.status(403).send('Unauthorized');
  }
  const commenterId = comment?.userId;
  if (!commenterId || comment.isAnonymous || comment.isPrivate) {
    res
      .status(commentFetchError || 401)
      .json({ message: 'Missing or private or anonymous comment' });
    return;
  }

  const { existing: existingGrant } = await getExistingPointsDontEnd(commentId);

  let results = undefined;
  if (existingGrant) {
    results = await executeAndEndSet500OnError(
      'UPDATE points SET points=?, reason=?, userId=?, granterId=? WHERE commentId=?',
      [points, reason, comment.userId, granterId, commentId],
      res
    );
  } else {
    results = await executeAndEndSet500OnError(
      'INSERT INTO points (points, reason, userId, commentId, granterId) VALUES (?, ?, ?, ?, ?)',
      [points, reason, comment.userId, commentId, granterId],
      res
    );
  }
  if (!results) return;
  res.status(204).end();
}
