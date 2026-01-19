import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError } from './comment-utils';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
 if(!checkIfPostOrSetError(req, res)) return;

res.setHeader('Set-Cookie', [
  'access_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0',
  'is_logged_in=; Path=/; SameSite=Lax; Max-Age=0',

  // prod parent domain
  'access_token=; HttpOnly; Path=/; Domain=voll-ki.fau.de; SameSite=Lax; Max-Age=0',
  'is_logged_in=; Path=/; Domain=voll-ki.fau.de; SameSite=Lax; Max-Age=0',
  // For a short while cookie domain was set to 'fau.de'. This would allow those users to logout.
  'access_token=; HttpOnly; Path=/; Domain=fau.de; SameSite=Lax; Max-Age=0',
  'is_logged_in=; Path=/; Domain=fau.de; SameSite=Lax; Max-Age=0',

  // staging
  'access_token=; HttpOnly; Path=/; Domain=kwarc.info; SameSite=Lax; Max-Age=0',
  'is_logged_in=; Path=/; Domain=kwarc.info; SameSite=Lax; Max-Age=0',
]);

  res.status(200).end();
}
