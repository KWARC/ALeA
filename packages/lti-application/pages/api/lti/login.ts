import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).send('Method not allowed');
  }

  const params = req.method === 'POST' ? req.body : req.query;
  const { login_hint, lti_message_hint, client_id } = params;
  const authorizationEndpoint = process.env.LTI_PLATFORM_AUTH_URL;
  const resolvedClientId = String(client_id || process.env.LTI_CLIENT_ID || '');

  if (!authorizationEndpoint) {
    return res.status(500).send('Missing LTI_PLATFORM_AUTH_URL');
  }

  if (!resolvedClientId) {
    return res.status(500).send('Missing LTI_CLIENT_ID');
  }

  if (!login_hint) {
    return res.status(400).send('Missing login_hint');
  }

  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${getBaseUrl(req)}/api/lti/launch`;
  const url = new URL(authorizationEndpoint);

  url.searchParams.set('scope', 'openid');
  url.searchParams.set('response_type', 'id_token');
  url.searchParams.set('response_mode', 'form_post');
  url.searchParams.set('prompt', 'none');
  url.searchParams.set('client_id', resolvedClientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('login_hint', String(login_hint));
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);

  if (lti_message_hint) {
    url.searchParams.set('lti_message_hint', String(lti_message_hint));
  }

  return res.redirect(url.toString());
}

function getBaseUrl(req: NextApiRequest) {
  if (process.env.LTI_TOOL_BASE_URL) {
    return process.env.LTI_TOOL_BASE_URL.replace(/\/$/, '');
  }

  const proto = req.headers['x-forwarded-proto'] ?? 'http';
  return `${String(proto).split(',')[0]}://${req.headers.host}`;
}
