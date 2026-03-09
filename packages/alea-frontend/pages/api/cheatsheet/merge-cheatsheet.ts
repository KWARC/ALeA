import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, ResourceName } from '@alea/utils';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!checkIfGetOrSetError(req, res)) return;

    const { courseId, instanceId, userId: filterUserId } = req.query;

    if (!courseId || !instanceId) {
      return res.status(422).send('Missing courseId or instanceId');
    }
    if (typeof courseId !== 'string' || typeof instanceId !== 'string') {
      return res.status(422).send('Invalid params');
    }
    if (!filterUserId || typeof filterUserId !== 'string') {
      return res.status(422).send('Missing userId – please select a student to merge');
    }

    const authUserId = await getUserIdIfAuthorizedOrSetError(
      req,
      res,
      ResourceName.COURSE_CHEATSHEET,
      Action.MUTATE,
      { courseId, instanceId }
    );
    if (!authUserId) return;

    const cheatsheetsDir = process.env.CHEATSHEETS_DIR;
    if (!cheatsheetsDir) {
      console.error('CHEATSHEETS_DIR not configured');
      return res.status(500).send('Internal server error');
    }
    const baseDir = path.resolve(cheatsheetsDir);
    const rows = await executeAndEndSet500OnError(
      `SELECT userId, fileName, weekId, createdAt
       FROM CheatSheet
       WHERE courseId = ? AND instanceId = ? AND userId = ?
       ORDER BY createdAt ASC`,
      [courseId, instanceId, filterUserId],
      res
    );
    if (!rows) return;
    if (rows.length === 0) {
      return res.status(404).send('No cheat sheets found for this student in this course instance');
    }

    const validFiles: { userId: string; filePath: string }[] = [];

    for (const row of rows) {
      const filePath = path.isAbsolute(row.fileName)
        ? row.fileName
        : path.resolve(baseDir, row.fileName);

      if (!filePath.startsWith(baseDir + path.sep) && filePath !== baseDir) {
        console.warn(`[merge] Path traversal blocked for ${row.userId}: ${filePath}`);
        continue;
      }
      if (!fs.existsSync(filePath)) {
        console.warn(`[merge] File not found for ${row.userId}: ${filePath}`);
        continue;
      }
      validFiles.push({ userId: row.userId, filePath });
    }

    if (validFiles.length === 0) {
      return res.status(404).send('No readable cheat sheet files found on disk');
    }

    interface LoadedPage {
      page: import('pdf-lib').PDFPage;
      width: number;
      height: number;
    }

    const loadedPages: LoadedPage[] = [];

    for (const { userId, filePath } of validFiles) {
      try {
        const pdfBytes = fs.readFileSync(filePath);
        const srcDoc = await PDFDocument.load(pdfBytes);
        const [srcPage] = srcDoc.getPages();
        const { width, height } = srcPage.getSize();
        loadedPages.push({ page: srcPage, width, height });
      } catch (err) {
        console.warn(`[merge] Failed to load PDF for ${userId}:`, err);
      }
    }

    if (loadedPages.length === 0) {
      return res.status(404).send('No readable cheat sheet files found on disk');
    }

    const PAGE_MARGIN = 10;
    const merged = await PDFDocument.create();

    for (let i = 0; i < loadedPages.length; i += 2) {
      const top = loadedPages[i];

      if (i + 1 >= loadedPages.length) {
        const [embedded] = await merged.embedPages([top.page]);
        const newPage = merged.addPage([top.width, top.height]);
        newPage.drawPage(embedded, { x: 0, y: 0, width: top.width, height: top.height });
        continue;
      }

      const bottom = loadedPages[i + 1];
      const pageW = top.width;
      const pageH = top.height;
      const halfH = pageH / 2;
      const topCropBottom = halfH;
      const topCropTop = pageH;
      const topCropHeight = topCropTop - topCropBottom; // = halfH

      const [embeddedTop] = await merged.embedPages(
        [top.page],
        [{ left: 0, bottom: topCropBottom, right: pageW, top: topCropTop }]
      );
      const botCropBottom = PAGE_MARGIN;
      const botCropTop = halfH;
      const botCropHeight = botCropTop - botCropBottom;

      const [embeddedBot] = await merged.embedPages(
        [bottom.page],
        [{ left: 0, bottom: botCropBottom, right: pageW, top: botCropTop }]
      );
      const outH = topCropHeight + botCropHeight;
      const newPage = merged.addPage([pageW, outH]);

      newPage.drawPage(embeddedTop, {
        x: 0,
        y: botCropHeight,
        width: pageW,
        height: topCropHeight,
      });
      newPage.drawPage(embeddedBot, {
        x: 0,
        y: 0,
        width: pageW,
        height: botCropHeight,
      });
    }

    if (merged.getPageCount() === 0) {
      console.error(
        `[merge] 0 pages added for courseId=${courseId} instanceId=${instanceId} userId=${filterUserId}`
      );
      return res.status(404).send('No readable cheat sheet files found on disk');
    }

    // ── Send binary response ─────────────────────────────────────────────────
    const mergedBytes = await merged.save();
    const mergedBuffer = Buffer.from(mergedBytes);
    const downloadName = `merged-cheatsheets-${courseId}-${instanceId}-${filterUserId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', mergedBuffer.byteLength);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.writeHead(200);
    res.write(mergedBuffer);
    res.end();
  } catch (error) {
    console.error('[merge] Error:', error);
    if (!res.headersSent) {
      res.status(500).send('Failed to merge cheat sheets');
    }
  }
}
