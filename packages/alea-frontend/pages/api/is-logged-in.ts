import { NextApiRequest, NextApiResponse } from 'next';
import { getUserId } from './comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.cookies.access_token;
  try {
    if (!token || !(await getUserId(req))) throw new Error('No token or invalid user');
    return res.status(200).json({ isLoggedIn: true });
  } catch (err) {
    res.setHeader('Set-Cookie', [
      'access_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0',
      'is_logged_in=; Path=/; SameSite=Lax; Max-Age=0',
    ]);
    return res.status(200).json({ loggedIn: false });
  }
}
