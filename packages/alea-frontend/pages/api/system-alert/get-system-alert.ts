import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const alertFile = process.env.ALEA_SYSTEM_ALERT_PATH;
    if (!alertFile) return res.status(500).send('Alert file path not configured');

    if (!fs.existsSync(alertFile))
      return res.status(200).json({ message: null, severity: 'error' });

    const content = JSON.parse(fs.readFileSync(alertFile, 'utf8'));
    return res.status(200).json(content);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
