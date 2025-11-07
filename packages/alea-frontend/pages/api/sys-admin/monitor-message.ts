import fs from 'fs/promises';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeApiAndSet500OnError } from '../comment-utils';

const MESSAGE_PATH = process.env.ALEA_MONITOR_MESSAGE_PATH;
const MONITOR_JSON_PATH = process.env.ALEA_MONITOR_STATUS_PATH;

if (!MESSAGE_PATH || !MONITOR_JSON_PATH) {
  throw new Error('Monitor message or status path not configured in env');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return executeApiAndSet500OnError(req, res, async () => {
    if (!checkIfGetOrSetError(req, res)) return;

    if (req.method === 'GET') {
      const [message, monitor] = await Promise.all([
        fs.readFile(MESSAGE_PATH, 'utf-8').catch(() => ''),
        fs
          .readFile(MONITOR_JSON_PATH, 'utf-8')
          .then((data) => JSON.parse(data))
          .catch(() => ({})),
      ]);

      return res.status(200).json({ message, monitor: monitor.endpoints || {} });
    }
  });
}
