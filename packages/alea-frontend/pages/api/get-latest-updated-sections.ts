import { Comment } from '@alea/spec';
import { executeAndEndSet500OnError } from './comment-utils';

export default async function handler(req, res) {
  const results: Comment[] = await executeAndEndSet500OnError(
    `SELECT uri, MAX(updatedtimestamp) AS updatedTimestamp
    FROM comments
    WHERE isPrivate !=1
    GROUP BY uri
    ORDER BY updatedTimestamp DESC`,
    [],
    res
  );
  if (!results) return;
  for (const c of results) {
    c.updatedTimestampSec = Date.parse(c['updatedTimestamp']) / 1000;
    delete c['updatedTimestamp'];
  }

  res.status(200).json(results);
}
