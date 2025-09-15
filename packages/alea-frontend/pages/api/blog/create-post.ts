import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError, executeQuery } from '../comment-utils';
import { Action, ResourceName } from '@alea/utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdIfAuthorizedOrSetError(req, res,ResourceName.BLOG,  Action.MUTATE);
  if (!userId) return;

  const { title, body, postId, heroImageId, heroImageUrl, heroImagePosition } = req.body;
  const userName = await executeQuery(`SELECT firstName, lastName FROM userInfo WHERE userId = ?`, [
    userId,
  ]);
  const authorName = userName[0].firstName + ' ' + userName[0].lastName;

  const sqlQuery = `INSERT INTO BlogPosts (title, body, postId, authorId, authorName, heroImageId, heroImageUrl , heroImagePosition) VALUES (?, ?, ?, ?, ?, ?, ? ,?)`;
  const values = [
    title,
    body,
    postId,
    userId,
    authorName,
    heroImageId ?? null,
    heroImageUrl ?? null,
    heroImagePosition ?? null,
  ];

  const result = await executeAndEndSet500OnError(sqlQuery, values, res);

  if (!result) return;
  res.status(201).json({ message: 'Blog post created successfully' });
}
