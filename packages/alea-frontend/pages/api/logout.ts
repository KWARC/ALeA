import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError } from './comment-utils';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
 if(!checkIfPostOrSetError(req, res)) return;
    res.setHeader('Set-Cookie', [
    'access_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0',
    'is_logged_in=; Path=/; SameSite=Lax; Max-Age=0',
  ]);

  res.status(200).end();
}
