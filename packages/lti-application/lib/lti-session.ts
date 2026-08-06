import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { LaunchDetails } from './lti';

const cookieName = 'alea_lti_launch';
const maxAgeSeconds = 60 * 60 * 4;

export type LtiLaunchSession = LaunchDetails & {
  userId: string;
  expiresAt: number;
};

export function createLtiUserId(details: LaunchDetails) {
  return `lti:${details.platformIssuer}:${details.user.id}`;
}

export function setLtiLaunchSessionCookie(res: NextApiResponse, details: LaunchDetails) {
  const session: LtiLaunchSession = {
    ...details,
    userId: createLtiUserId(details),
    expiresAt: Date.now() + maxAgeSeconds * 1000,
  };
  const value = signSession(session);

  res.setHeader('Set-Cookie', [
    `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`,
  ]);
}

export function getLtiLaunchSession(req: NextApiRequest) {
  const signedValue = parseCookies(req.headers.cookie ?? '')[cookieName];
  if (!signedValue) return undefined;

  const [payload, signature] = signedValue.split('.');
  if (!payload || !signature) return undefined;

  const expectedSignature = signPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return undefined;
  }

  const session = JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8')
  ) as LtiLaunchSession;

  if (session.expiresAt < Date.now()) return undefined;
  return session;
}

function signSession(session: LtiLaunchSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${signPayload(payload)}`;
}

function signPayload(payload: string) {
  return crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

function getSessionSecret() {
  return process.env.LTI_SESSION_SECRET ?? 'development-lti-session-secret';
}

function parseCookies(cookieHeader: string) {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separatorIndex = cookie.indexOf('=');
        if (separatorIndex === -1) return [cookie, ''];
        return [
          cookie.slice(0, separatorIndex),
          decodeURIComponent(cookie.slice(separatorIndex + 1)),
        ];
      })
  );
}
