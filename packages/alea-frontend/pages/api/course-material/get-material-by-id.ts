import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(422).send('Missing required parameter: id');
  }

  try {
    const results = await executeAndEndSet500OnError(
      `SELECT storageFileName, mimeType, materialName 
       FROM CourseMaterials 
       WHERE id = ? AND materialType = 'FILE'`,
      [id],
      res
    );

    if (!results || results.length === 0) {
      return res.status(404).send('Resource not found');
    }

    const { storageFileName, mimeType, materialName } = results[0];

    const BASE_PATH = process.env.MATERIALS_DIR || path.join(process.cwd(), 'materials');
    const absoluteFilePath = path.join(BASE_PATH, String(storageFileName).trim());

    if (!fs.existsSync(absoluteFilePath)) {
      return res.status(404).send('File not found on server');
    }

    const stat = fs.statSync(absoluteFilePath);
    const ext = path.extname(String(storageFileName).trim());
    const downloadFileName = `${String(materialName).trim()}${ext}`;
    const forceDownload = req.query.download === 'true';
    const isPdf = String(mimeType).toLowerCase() === 'application/pdf';
    const disposition =
      !forceDownload && isPdf
        ? `inline; filename="${downloadFileName}"`
        : `attachment; filename="${downloadFileName}"`;

    res.setHeader('Content-Type', String(mimeType || 'application/octet-stream'));
    res.setHeader('Content-Disposition', disposition);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const readStream = fs.createReadStream(absoluteFilePath);
    readStream.pipe(res);

    readStream.on('error', (err) => {
      console.error(`Error streaming file ${materialName}:`, err);
      if (!res.headersSent) {
        res.status(500).send('Internal Server Error');
      }
    });
  } catch (error) {
    console.error('File serving error:', error);
    return res.status(500).send('Failed to serve document');
  }
}
