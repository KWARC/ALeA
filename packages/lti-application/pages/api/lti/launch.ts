import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getLaunchRoles,
  getLaunchUser,
  getRoleType,
  launchUserToQuery,
} from '../../../lib/lti';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method not allowed');
  }

  const idToken = typeof req.body.id_token === 'string' ? req.body.id_token : '';

  if (!idToken) {
    return res.status(400).send('Missing id_token');
  }

  try {
    const payload = decodeJwtPayload(idToken);
    const user = getLaunchUser(payload);
    const roleType = getRoleType(getLaunchRoles(payload));
    const query = launchUserToQuery(user, roleType);

    return res.redirect(303, `/lti-user?${query}`);
  } catch (error) {
    return res
      .status(400)
      .send(error instanceof Error ? error.message : 'Invalid id_token');
  }
}

function decodeJwtPayload(idToken: string) {
  const parts = idToken.split('.');

  if (parts.length !== 3) {
    throw new Error('Invalid JWT');
  }

  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >;
}
