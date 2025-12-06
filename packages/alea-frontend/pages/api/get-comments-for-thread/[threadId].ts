import { Comment } from '@alea/spec';
import { executeDontEndSet500OnError } from '../comment-utils';
import { processResults } from '../get-comments';

export default async function handler(req, res) {
  const { threadId } = req.query;
  const threadIdNum = +threadId;
  if (!threadIdNum) {
    return res.status(400).json({
      error: `Invalid input: [${threadId}]`,
    });
  }
  const query = `SELECT * FROM comments WHERE (isPrivate != 1 AND isDeleted != 1) AND threadId = ?`;

  const results = await executeDontEndSet500OnError(query, [threadId], res);
  if (!results) return;
  const addedPoints = await processResults(res, results as Comment[]);
  if (!addedPoints) return;
  res.status(200).json(results);
}
