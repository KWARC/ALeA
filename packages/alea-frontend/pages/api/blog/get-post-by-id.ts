import { PublicBlogPost } from '@alea/spec';
import { executeDontEndSet500OnError } from '../comment-utils';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { postId } = req.query;
  const posts: PublicBlogPost[] = await executeDontEndSet500OnError(
    `SELECT title, body, postId, authorName, heroImageId, heroImageUrl, heroImagePosition, createdAt, updatedAt
     FROM BlogPosts WHERE postId = ?`,
    [postId],
    res
  );
  if (!posts?.length) {
    return res.status(404).json({ message: 'Post not found' });
  }
  res.status(200).json(posts[0]);
}
