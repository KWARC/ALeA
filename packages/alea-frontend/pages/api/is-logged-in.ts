import { NextApiRequest, NextApiResponse } from 'next';
import { getUserId } from './comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.cookies.access_token;
  if (!token) {
    return res.status(200).json({ loggedIn: false });
  }
  try {
    const userId = await getUserId(req);
    if (!userId) {
      res.setHeader('Set-Cookie', [
        'access_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0',
        'is_logged_in=; Path=/; SameSite=Lax; Max-Age=0',
      ]);
      return res.status(200).json({ isLoggedIn: false });
    }

    return res.status(200).json({ isLoggedIn: true });
  } catch (err) {
    return res.status(200).json({ isLoggedIn: false });
  }
}
