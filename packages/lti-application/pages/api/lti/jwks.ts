import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const publicKey = readPublicKey();
  const jwk = crypto.createPublicKey(publicKey).export({ format: 'jwk' });

  return res.status(200).json({
    keys: [
      {
        ...jwk,
        kid: process.env.LTI_TOOL_KEY_ID ?? 'hello-world-key',
        alg: 'RS256',
        use: 'sig',
      },
    ],
  });
}

function readPublicKey() {
  const keysDirs = [
    path.join(process.cwd(), 'packages/lti-application/keys'),
    path.join(process.cwd(), 'keys'),
  ];
  const candidates = ['public.pem', 'public.key'];

  for (const keysDir of keysDirs) {
    for (const fileName of candidates) {
      const keyPath = path.join(keysDir, fileName);

      if (fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath, 'utf8');
      }
    }
  }

  throw new Error('Missing public key in packages/lti-application/keys');
}
