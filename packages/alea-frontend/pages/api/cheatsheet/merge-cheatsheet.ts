import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'node:fs';
import path from 'node:path';
import { buildQrCodeSecure, mergeCheatsheets, resolveSafeCheatsheetPath } from '@alea/node-utils';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { resolveTargetUserIdOrsetError } from './get-cheatsheets';

export { mergeCheatsheets };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!checkIfGetOrSetError(req, res)) return;
    const { universityId, courseId, courseName, instanceId } = req.query;
    if (!universityId || !courseId || !instanceId) {
      return res.status(422).send('Missing parameters');
    }
    if (
      typeof universityId !== 'string' ||
      typeof courseId !== 'string' ||
      typeof instanceId !== 'string'
    ) {
      return res.status(422).send('Invalid parameters');
    }

    const targetUserId = await resolveTargetUserIdOrsetError(
      req,
      res,
      courseId,
      instanceId,
      req.query.userId
    );
    if (!targetUserId) return;
    const cheatsheetsDir = process.env.CHEATSHEETS_DIR;
    if (!cheatsheetsDir) {
      return res.status(500).send('CHEATSHEETS_DIR not configured');
    }
    const baseDir = path.resolve(cheatsheetsDir);
    const rows = await executeAndEndSet500OnError(
      `SELECT userId, fileName, weekId, createdAt, studentName
       FROM CheatSheet
       WHERE courseId=? AND instanceId=? AND userId=?
       ORDER BY weekId ASC`,
      [courseId, instanceId, targetUserId],
      res
    );
    if (!rows) return;
    if (rows.length === 0) {
      return res.status(404).send('No cheat sheets found');
    }
    const validFiles: string[] = [];
    for (const row of rows) {
      if (!row.fileName) {
        console.warn('Skipping row with missing fileName:', row);
        continue;
      }
      const filePath = resolveSafeCheatsheetPath(baseDir, row.fileName);
      if (!filePath || !fs.existsSync(filePath)) continue;
      validFiles.push(filePath);
    }
    if (validFiles.length === 0) {
      return res.status(404).send('No cheat sheet files found on disk');
    }
    const pdfBuffers: Buffer[] = [];
    for (const filePath of validFiles) {
      pdfBuffers.push(fs.readFileSync(filePath));
    }

    const firstRow = rows[0];
    const lastRow = rows[rows.length - 1];
    const fields = {
      courseName: (typeof courseName === 'string' && courseName) || courseId,
      courseId,
      instanceId,
      universityId,
      studentName: firstRow.studentName,
      studentId: firstRow.userId,
      createdAt: firstRow.createdAt,
      weekId: lastRow.weekId,
    };
    const mergeId = `${universityId}|${courseId}|${instanceId}|${targetUserId}|upto${lastRow.weekId}`;
    const qrImage = await buildQrCodeSecure({ mergeId });
    if (!qrImage) {
      return res.status(500).send('Failed to generate QR code');
    }
    const mergedPdf = await mergeCheatsheets(fields, qrImage, pdfBuffers);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cheatsheet-${fields.studentId}.pdf"`
    );
    return res.status(200).send(mergedPdf);
  } catch (err) {
    console.error('merge cheatsheet error:', err);
    return res.status(500).send('Failed to generate cheatsheet PDF');
  }
}
