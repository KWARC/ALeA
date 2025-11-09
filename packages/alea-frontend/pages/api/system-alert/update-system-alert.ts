import { Action, ResourceName } from '@alea/utils';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfPostOrSetError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!checkIfPostOrSetError(req, res)) return;
    const userId = await getUserIdIfAuthorizedOrSetError(
      req,
      res,
      ResourceName.SYSADMIN_SYSTEM_ALERT,
      Action.MUTATE
    );
    if (!userId) return;

    const alertFile = process.env.ALEA_SYSTEM_ALERT_PATH;
    if (!alertFile) return res.status(500).send('Alert file path not configured');

    const { message, severity } = req.body;
    if (typeof message !== 'string') {
      return res.status(400).send('Message must be a string');
    }
    if (!['info', 'warning', 'error'].includes(severity)) {
      return res.status(400).send('Severity must be one of: info, warning, error');
    }

    fs.writeFileSync(alertFile, JSON.stringify({ message, severity }, null, 2));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
