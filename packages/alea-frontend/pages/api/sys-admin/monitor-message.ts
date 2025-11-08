import fs from 'fs/promises';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, getUserIdOrSetError } from '../comment-utils';
import { Action, ResourceName, SYSADMIN_RESOURCE_AND_ACTION } from '@alea/utils';

const MESSAGE_PATH = process.env.ALEA_MONITOR_MESSAGE_PATH;
const MONITOR_JSON_PATH = process.env.ALEA_MONITOR_STATUS_PATH;

if (!MESSAGE_PATH || !MONITOR_JSON_PATH) {
  throw new Error('Monitor message or status path not configured in env');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const allowed = SYSADMIN_RESOURCE_AND_ACTION.some(
    (ra) => ra.resource === ResourceName.SYSADMIN_SYSTEM_ALERT && ra.action === Action.MUTATE
  );

  if (!allowed) {
    return res.status(403).send('Not authorized to view monitor status');
  }

  const [message, monitor] = await Promise.all([
    fs.readFile(MESSAGE_PATH, 'utf-8').catch(() => ''),
    fs
      .readFile(MONITOR_JSON_PATH, 'utf-8')
      .then((data) => JSON.parse(data))
      .catch(() => ({})),
  ]);

  return res.status(200).json({ message, monitor: monitor.endpoints || {} });
}
