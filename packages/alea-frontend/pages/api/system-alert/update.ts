import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, getUserIdOrSetError } from '../comment-utils';
import { Action, ResourceName, SYSADMIN_RESOURCE_AND_ACTION } from '@alea/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    checkIfPostOrSetError(req, res);

    const userId = await getUserIdOrSetError(req, res);
    if (!userId) return;
    console.log('abc', { userId });

    const allowed = SYSADMIN_RESOURCE_AND_ACTION.some(
      (ra) => ra.resource === ResourceName.SYSADMIN_SYSTEM_ALERT && ra.action === Action.MUTATE
    );
    if (!allowed) return res.status(403).json({ error: 'Not authorized to update system alert' });

    const alertFile = process.env.ALEA_SYSTEM_ALERT_PATH;
    if (!alertFile) return res.status(500).json({ error: 'Alert file path not configured' });

    const { message, severity } = req.body;
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message must be a non-empty string' });
    }
    if (!['info', 'warning', 'error'].includes(severity)) {
      return res.status(400).json({ error: 'Severity must be one of: info, warning, error' });
    }

    fs.writeFileSync(alertFile, JSON.stringify({ message, severity }, null, 2));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
