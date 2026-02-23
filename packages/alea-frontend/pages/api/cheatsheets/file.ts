import { NextApiRequest, NextApiResponse } from 'next';
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * Serves cheatsheet PDF files for download and preview.
 * Query param: filename=<filename.pdf>
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename } = req.query;

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Missing required query param: filename' });
  }

  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  if (!filename.endsWith('.pdf')) {
    return res.status(400).json({ error: 'Only PDF files are allowed' });
  }

  const cheatsheetsDir = process.env.CHEATSHEETS_DIR;
  if (!cheatsheetsDir) {
    return res.status(500).json({ error: 'CHEATSHEETS_DIR environment variable not set' });
  }

  try {
    const filePath = path.join(cheatsheetsDir, filename);

    // Ensure the resolved path is within CHEATSHEETS_DIR (prevent directory traversal)
    const normalizedCheatDir = path.normalize(cheatsheetsDir);
    const normalizedFilePath = path.normalize(filePath);
    if (!normalizedFilePath.startsWith(normalizedCheatDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const fileContent = await readFile(filePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', fileContent.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(fileContent);
  } catch (error: any) {
    console.error('Error serving cheatsheet file:', error);

    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }

    return res.status(500).json({ error: 'Failed to serve file' });
  }
}
