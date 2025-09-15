import { Comment } from '@alea/spec';
import {
  executeDontEndSet500OnError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from './comment-utils';
import { processResults } from './get-comments';

export default async function handler(req, res) {
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const comments: Comment[] = await executeDontEndSet500OnError(
    `SELECT * FROM comments WHERE userId = ?`,
    [userId],
    res
  );
  if (!comments) return;
  const addedPoints = await processResults(res, comments);
  if (!addedPoints) return;

  const history = await executeAndEndSet500OnError(
    `SELECT * FROM updateHistory WHERE ownerId = ?`,
    [userId],
    res
  );
  res.status(200).json({ comments, history });
}
