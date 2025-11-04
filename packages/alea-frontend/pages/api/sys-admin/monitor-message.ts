import fs from 'fs/promises';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeApiAndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../../../../alea-frontend/pages/api/access-control/resource-utils';
import { ResourceName, Action } from '@alea/utils';

const MESSAGE_PATH = process.env.ALEA_MONITOR_MESSAGE_PATH;
const MONITOR_JSON_PATH = process.env.ALEA_MONITOR_STATUS_PATH;

if (!MESSAGE_PATH || !MONITOR_JSON_PATH) {
  throw new Error('Monitor message or status path not configured in env');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return executeApiAndSet500OnError(req, res, async () => {
    // if (!checkIfGetOrSetError(req, res)) return;

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

    if (req.method === 'POST') {
      // Allow only authorized sys-admins to update message
      // await getUserIdIfAuthorizedOrSetError(
      //   req,
      //   res,
      //   ResourceName.SYSADMIN_MONITOR_MESSAGE,
      //   Action.MUTATE,
      //   {}
      // );

      const { message } = req.body;
      if (typeof message !== 'string') {
        return res.status(400).json({ error: 'Invalid message' });
      }

      await fs.writeFile(MESSAGE_PATH, message, 'utf-8');
      return res.status(200).json({ success: true });
    }
  });
}
