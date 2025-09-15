import { Comment, GetCommentsRequest, PointsGrant } from '@alea/spec';
import {
  executeAndEndSet500OnError,
  executeDontEndSet500OnError,
  getUserId,
} from './comment-utils';

// Returns success as true or false.
export async function processResults(
  res,
  results: Comment[]
): Promise<boolean> {
  const commentIds = results.map((c) => c.commentId);
  const userIds = results.map((c) => c.userId);

  const commentIdToPoints = new Map<number, number>();
  if (commentIds.length) {
    const pointResults = (await executeDontEndSet500OnError(
      'SELECT * FROM points WHERE commentId IN (?)',
      [commentIds],
      res
    )) as PointsGrant[];
    if (!pointResults) return false;
    for (const r of pointResults) {
      commentIdToPoints.set(r.commentId, r.points);
    }
  }

  const userIdToPoints = new Map<string, number>();
  if (userIds.length) {
    const userPointResults = (await executeAndEndSet500OnError(
      'SELECT userId, SUM(points) as points FROM points WHERE userId IN (?) GROUP BY userId;',
      [userIds],
      res
    )) as any[];
    if (!userPointResults) return false;
    for (const r of userPointResults) userIdToPoints.set(r.userId, r.points);
  }

  for (const c of results) {
    c.isPrivate = !!c.isPrivate;
    c.isAnonymous = !!c.isAnonymous;
    c.isDeleted = !!c.isDeleted;
    c.isEdited = !!c.isEdited;
    c.pointsGranted = commentIdToPoints.get(c.commentId) ?? 0;
    c.totalPoints = userIdToPoints.get(c.userId) ?? 0;
    c.postedTimestampSec = Date.parse(c['postedTimestamp']) / 1000;
    c.updatedTimestampSec = Date.parse(c['updatedTimestamp']) / 1000;
    delete c['postedTimestamp'];
    delete c['updatedTimestamp'];
  }
  return true;
}

export default async function handler(req, res) {
  const { uris } = req.body as GetCommentsRequest;
  if (!uris?.length) {
    res.status(200).json([]);
    return;
  }


  const userId = (await getUserId(req)) || '';
  const fileConstraint = Array(uris.length)
    .fill('(uri = ?)')
    .join(' OR ');

  const query = `SELECT * FROM comments WHERE (isPrivate != 1 OR userId = ? ) AND ( ${fileConstraint} )`;
  const queryValues = [userId];
  uris.forEach((uri) => queryValues.push(uri));

  const results = await executeDontEndSet500OnError(query, queryValues, res);
  if (!results) return;
  const addedPoints = await processResults(res, results as Comment[]);
  if (!addedPoints) return;
  res.status(200).json(results);
}
