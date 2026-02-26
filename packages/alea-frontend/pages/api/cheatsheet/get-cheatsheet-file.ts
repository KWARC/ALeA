import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse<Buffer | string>) {
  try {
    if (!checkIfGetOrSetError(req, res)) return;
    const { checksum } = req.query;
    if (!checksum || typeof checksum !== 'string') {
      return res.status(422).send('Missing or invalid checksum');
    }

    const result = await executeAndEndSet500OnError(
      ` SELECT fileName,weekId FROM CheatSheet WHERE checksum = ? LIMIT 1`,
      [checksum],
      res
    );
    if (!result) return;
    if (result.length === 0) return res.status(404).send('Checksum not found');
    const { fileName, weekId } = result[0];

    const cheatsheetsDir = process.env.CHEATSHEETS_DIR;
    if (!cheatsheetsDir) {
      console.error('CHEATSHEETS_DIR not configured');
      return res.status(500).send('Internal server error');
    }
    const baseDir = path.resolve(cheatsheetsDir);
    const filePath = path.resolve(baseDir, fileName);

    if (!filePath.startsWith(baseDir)) return res.status(400).send('Invalid file path');
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

    const stat = fs.statSync(filePath);
    const downloadName = `cheatsheet-${weekId}.pdf`;
    const isDownload = req.query.download === 'true';
    const stream = fs.createReadStream(filePath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stat.size);
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${downloadName}"`
    );
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).end('Failed to read file');
      } else {
        res.destroy();
      }
    });

    req.on('close', () => {
      stream.destroy();
    });

    stream.pipe(res);
  } catch (error) {
    console.error('Error fetching cheatsheet file:', error);
    if (!res.headersSent) {
      res.status(500).send('Failed to fetch cheatsheet file');
    }
  }
}
