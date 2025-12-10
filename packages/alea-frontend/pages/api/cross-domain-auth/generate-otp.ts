import crypto from 'crypto';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';

function isFauHost(req: NextApiRequest) {
  const host = req.headers.host || '';
  const fauDomain = process.env.NEXT_PUBLIC_FAU_DOMAIN || 'courses.voll-ki.fau.de';
  return host === fauDomain || host.endsWith('.' + fauDomain);
}

// Parse cookies from request headers
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.trim().split('=');
    if (parts.length === 2) {
      cookies[parts[0].trim()] = decodeURIComponent(parts[1].trim());
    }
  });

  return cookies;
}

// Extract JWT from Authorization header or cookie
function getJwtToken(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('JWT ')) {
    return authHeader.substring(4);
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies['access_token'] || null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  if (!isFauHost(req)) return res.status(403).send('Forbidden domain');

  // Get JWT token from request
  const jwtToken = getJwtToken(req);
  if (!jwtToken) return res.status(401).send('No JWT token found. Please log in first.');

  // Generate a secure random OTP token
  const otpToken = crypto.randomUUID();

  const result = await executeAndEndSet500OnError(
    `INSERT INTO CrossDomainAuthTokens (otpToken, jwtToken) VALUES (?, ?)`,
    [otpToken, jwtToken],
    res
  );
  if (!result) return;

  return res.status(200).json({ otpToken });
}
