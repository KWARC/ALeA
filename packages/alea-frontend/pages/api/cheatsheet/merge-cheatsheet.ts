import PDFKit from 'pdfkit';
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { CheatsheetFields, drawHeader, drawWatermark } from './create-cheatsheet';
import { buildQrCodeSecure } from './create-cheatsheet';
import { resolveTargetUserIdOrsetError } from './get-cheatsheets';

export async function mergeCheatsheets(
  fields: CheatsheetFields,
  qrImage: string,
  pdfBuffers: Buffer[]
): Promise<Buffer> {
  const headerBuffer = await new Promise<Buffer>((resolve) => {
    const buffers: Buffer[] = [];
    const PAGE_MARGIN = 10;
    const doc = new PDFKit({
      size: 'A4',
      margin: PAGE_MARGIN,
      autoFirstPage: false,
    });
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.addPage();
    const { height } = doc.page;
    const HEADER_TOP = PAGE_MARGIN;
    const HEADER_HEIGHT = (height - PAGE_MARGIN * 2) / 2;
    const rows: [string, string][] = [
      ['Course Name', fields.courseName],
      ['Course Id', fields.courseId],
      ['Instance Id', fields.instanceId],
      ['University Id', fields.universityId],
      ['Student Name', fields.studentName],
      ['Student Id', fields.studentId],
      ['Upto Week Id', fields.weekId],
      [
        'Generated At',
        new Date(fields.createdAt).toLocaleString('en-IN', {
          timeZoneName: 'short',
        }),
      ],
    ];
    drawHeader(doc, rows, qrImage, HEADER_TOP, HEADER_HEIGHT);
    drawWatermark(doc, fields);
    doc.end();
  });

  const finalDoc = await PDFDocument.create();
  const headerPdf = await PDFDocument.load(headerBuffer);
  const headerPage = headerPdf.getPages()[0];
  const { width, height } = headerPage.getSize();
  const embeddedHeader = await finalDoc.embedPage(headerPage, {
    left: 0,
    bottom: height / 2,
    right: width,
    top: height,
  });
  let halves: any[] = [];
  let isFirstBottomPlaced = false;
  for (const buffer of pdfBuffers) {
    const src = await PDFDocument.load(buffer);
    for (const page of src.getPages()) {
      const { width, height } = page.getSize();
      const bottomHalf = await finalDoc.embedPage(page, {
        left: 0,
        bottom: 0,
        right: width,
        top: height / 2,
      });
      if (!isFirstBottomPlaced) {
        const firstPage = finalDoc.addPage([width, height]);
        firstPage.drawPage(embeddedHeader, {
          x: 0,
          y: height / 2,
          width,
          height: height / 2,
        });
        firstPage.drawPage(bottomHalf, {
          x: 0,
          y: 0,
          width,
          height: height / 2,
        });
        isFirstBottomPlaced = true;
        continue;
      }
      halves.push({
        bottomHalf,
        width,
        height: height / 2,
      });
      if (halves.length === 2) {
        const newPage = finalDoc.addPage([width, height]);
        newPage.drawPage(halves[0].bottomHalf, {
          x: 0,
          y: height / 2,
          width,
          height: height / 2,
        });
        newPage.drawPage(halves[1].bottomHalf, {
          x: 0,
          y: 0,
          width,
          height: height / 2,
        });
        halves = [];
      }
    }
  }

  if (halves.length === 1) {
    const { width, height } = halves[0];
    const page = finalDoc.addPage([width, height * 2]);
    page.drawPage(halves[0].bottomHalf, {
      x: 0,
      y: height,
      width,
      height,
    });
  }
  const bytes = await finalDoc.save();
  return Buffer.from(bytes);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!checkIfGetOrSetError(req, res)) return;
    const { universityId, courseId, courseName,instanceId, userId: filterUserId } = req.query;
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
       ORDER BY createdAt ASC`,
      [courseId, instanceId, filterUserId],
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
      const filePath = path.isAbsolute(row.fileName)
        ? row.fileName
        : path.resolve(baseDir, row.fileName);
      if (!filePath.startsWith(baseDir + path.sep)) continue;
      if (!fs.existsSync(filePath)) continue;
      validFiles.push(filePath);
    }
    if (validFiles.length === 0) {
      return res.status(404).send('No cheat sheet files found on disk');
    }
    const pdfBuffers: Buffer[] = [];
    for (const filePath of validFiles) {
      const buffer = fs.readFileSync(filePath);
      pdfBuffers.push(buffer);
    }

    const firstRow = rows[0];
    const lastRow = rows[rows.length - 1];
    const fields = {
      courseName: courseName as string || courseId,
      courseId,
      instanceId,
      universityId,
      studentName: firstRow.studentName,
      studentId: firstRow.userId,
      createdAt: firstRow.createdAt,
      weekId:lastRow.weekId,
    };
    const mergeId = `${universityId}|${courseId}|${instanceId}|${filterUserId}|upto${lastRow.weekId}`;
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
