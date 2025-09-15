import { Action, ResourceName } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdIfAuthorizedOrSetError(req, res, ResourceName.BLOG, Action.MUTATE);
  if (!userId) return;

  const { postId } = req.body;
  const result = await executeAndEndSet500OnError(
    `DELETE FROM BlogPosts WHERE postId = ?`,
    [postId],
    res
  );

  if (!result) return;
  res.status(200).json({ message: 'Post deleted successfully' });
}
