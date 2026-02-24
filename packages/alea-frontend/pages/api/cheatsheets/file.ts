import { NextApiRequest, NextApiResponse } from 'next';
import { readFile } from 'fs/promises';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  const { filename } = req.query;

  if (!filename || typeof filename !== 'string' || !filename.endsWith('.pdf')) {
    return res.status(400).send('Invalid or missing filename');
  }

  const cheatsheetsDir = process.env.CHEATSHEETS_DIR;
  if (!cheatsheetsDir) {
    return res.status(500).send('CHEATSHEETS_DIR environment variable not set');
  }

  const filePath = path.resolve(cheatsheetsDir, filename);
  if (!filePath.startsWith(path.resolve(cheatsheetsDir))) {
    return res.status(403).send('Access denied');
  }

  try {
    const fileContent = await readFile(filePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', fileContent.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(fileContent);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return res.status(404).send('File not found');
    }
    return res.status(500).send('Failed to serve file');
  }
}
