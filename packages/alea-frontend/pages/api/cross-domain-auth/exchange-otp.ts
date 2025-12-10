import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeDontEndSet500OnError,
} from '../comment-utils';

interface OTPRecord {
  otpToken: string;
  jwtToken: string;
  createdAt: Date;
  used: boolean;
}

function isNonFauHost(req: NextApiRequest) {
  return req.headers.host === process.env.NEXT_PUBLIC_NON_FAU_DOMAIN;
}

const EXPIRATION_SECONDS = parseInt(process.env.CROSS_DOMAIN_AUTH_EXPIRATION_SECONDS || '30', 10);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  if (!isNonFauHost(req)) return res.status(403).send('Forbidden domain');

  const { otpToken } = req.body;

  if (!otpToken || typeof otpToken !== 'string') return res.status(422).send('OTP token missing');

  const records = (await executeDontEndSet500OnError<OTPRecord[]>(
    `SELECT otpToken, jwtToken, createdAt, used FROM CrossDomainAuthTokens WHERE otpToken = ?`,
    [otpToken],
    res
  )) as OTPRecord[];
  if (!records) return;
  const record = records[0];
  if (!record || record.used) return res.status(404).send('Invalid OTP token');

  const result = await executeAndEndSet500OnError(
    `DELETE FROM CrossDomainAuthTokens WHERE otpToken = ?`,
    [otpToken],
    res
  );
  if (!result) return;

  // Check if token is expired
  const createdAt = new Date(record.createdAt);
  if (createdAt.getTime() + EXPIRATION_SECONDS * 1000 < Date.now())
    return res.status(410).send('OTP token has expired');

  const cookieOptions = [
    `access_token=${record.jwtToken}`,
    /* TODO: Uncomment this when we can handle httpOnly cookies.
    'HttpOnly',
    'Secure',
    'SameSite=Lax',*/
    'Path=/',
    `Max-Age=${365 * 24 * 60 * 60}`, // 1 year
  ].join('; ');

  res.setHeader('Set-Cookie', cookieOptions).send('Authentication successful');
}
