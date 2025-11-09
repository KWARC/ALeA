import { Action, ResourceName } from '@alea/utils';
import fs from 'fs/promises';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfGetOrSetError } from '../comment-utils';

const MONITOR_JSON_PATH = process.env.ALEA_MONITOR_STATUS_PATH;

if (!MONITOR_JSON_PATH) {
  throw new Error('Monitor status path not configured in env');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.SYSADMIN_SYSTEM_ALERT,
    Action.MUTATE
  );
  if (!userId) return;

  const monitor = await fs
    .readFile(MONITOR_JSON_PATH, 'utf-8')
    .then((data) => JSON.parse(data))
    .catch(() => ({}));

  return res.status(200).json({ monitor: monitor.endpoints || {} });
}
