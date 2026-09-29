import PDFKit from 'pdfkit';
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { degrees, PDFDocument, PDFEmbeddedPage, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { CheatsheetFields, drawHeader, drawWatermark } from './create-cheatsheet';
import { buildQrCodeSecure } from './create-cheatsheet';
import { resolveTargetUserIdOrsetError } from './get-cheatsheets';

function drawPageFooter(
  page: PDFPage,
  font: PDFFont,
  studentName: string,
  pageNumber: number,
  pageCount: number,
  pageWidth: number,
  margin: number,
  y: number
) {
  const fontSize = 9;
  const name =
    (studentName || '').replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, '').trim() || 'Student';
  const pageLabel = `${pageNumber} / ${pageCount}`;
  const color = rgb(0.25, 0.25, 0.25);
  const pageLabelWidth = font.widthOfTextAtSize(pageLabel, fontSize);

  page.drawText(name, {
    x: margin,
    y,
    size: fontSize,
    font,
    color,
  });
  page.drawText(pageLabel, {
    x: pageWidth - margin - pageLabelWidth,
    y,
    size: fontSize,
    font,
    color,
  });
}

export async function mergeCheatsheets(
  fields: CheatsheetFields,
  qrImage: string,
  pdfBuffers: Buffer[]
): Promise<Buffer> {
  const logoPath = path.resolve(process.cwd(), 'public/alea-logo.png');
  const logoImage = fs.readFileSync(logoPath);
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
    ];
    drawHeader(doc, rows, qrImage, HEADER_TOP, HEADER_HEIGHT, logoImage);
    drawWatermark(doc, fields);
    doc.end();
  });

  const finalDoc = await PDFDocument.create();
  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;
  const PAGE_MARGIN = 20;
  const SHEET_GAP = 14;
  const FOOTER_FONT_SIZE = 9;
  const FOOTER_BOTTOM_MARGIN = 24;
  const contentBottom = FOOTER_BOTTOM_MARGIN + FOOTER_FONT_SIZE + 12;
  const contentWidth = A4_WIDTH - PAGE_MARGIN * 2;
  const halfHeight = (A4_HEIGHT - PAGE_MARGIN - contentBottom - SHEET_GAP) / 2;
  const bottomSlot = {
    x: PAGE_MARGIN,
    y: contentBottom,
    width: contentWidth,
    height: halfHeight,
  };
  const topSlot = {
    x: PAGE_MARGIN,
    y: contentBottom + halfHeight + SHEET_GAP,
    width: contentWidth,
    height: halfHeight,
  };
  const headerPdf = await PDFDocument.load(headerBuffer);
  const headerPage = headerPdf.getPages()[0];
  const { width: headerWidth, height: headerHeight } = headerPage.getSize();
  const embeddedHeader = await finalDoc.embedPage(headerPage, {
    left: 0,
    bottom: headerHeight / 2,
    right: headerWidth,
    top: headerHeight,
  });

  type ContentHalf = {
    page: PDFEmbeddedPage;
    rotation: 0 | 90 | 180 | 270;
  };

  const contentHalves: ContentHalf[] = [];
  for (const buffer of pdfBuffers) {
    const src = await PDFDocument.load(buffer);
    for (const page of src.getPages()) {
      const { width, height } = page.getSize();
      const rotation = (((page.getRotation().angle % 360) + 360) % 360) as 0 | 90 | 180 | 270;
      const crop =
        rotation === 90
          ? { left: width / 2, bottom: 0, right: width, top: height }
          : rotation === 180
          ? { left: 0, bottom: height / 2, right: width, top: height }
          : rotation === 270
          ? { left: 0, bottom: 0, right: width / 2, top: height }
          : { left: 0, bottom: 0, right: width, top: height / 2 };

      contentHalves.push({
        page: await finalDoc.embedPage(page, crop),
        rotation,
      });
    }
  }

  const drawContentHalf = (
    targetPage: ReturnType<typeof finalDoc.addPage>,
    content: ContentHalf,
    box: { x: number; y: number; width: number; height: number }
  ) => {
    const { x, y, width, height } = box;
    if (content.rotation === 90) {
      targetPage.drawPage(content.page, {
        x,
        y: y + height,
        width: height,
        height: width,
        rotate: degrees(270),
      });
    } else if (content.rotation === 180) {
      targetPage.drawPage(content.page, {
        x: x + width,
        y: y + height,
        width,
        height,
        rotate: degrees(180),
      });
    } else if (content.rotation === 270) {
      targetPage.drawPage(content.page, {
        x: x + width,
        y,
        width: height,
        height: width,
        rotate: degrees(90),
      });
    } else {
      targetPage.drawPage(content.page, {
        x,
        y,
        width,
        height,
      });
    }
  };

  const pages: PDFPage[] = [];
  if (contentHalves.length > 0) {
    const firstPage = finalDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    pages.push(firstPage);
    firstPage.drawPage(embeddedHeader, topSlot);
    drawContentHalf(firstPage, contentHalves[0], bottomSlot);

    for (let index = 1; index < contentHalves.length; index += 2) {
      const page = finalDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      pages.push(page);
      drawContentHalf(page, contentHalves[index], topSlot);
      if (contentHalves[index + 1]) {
        drawContentHalf(page, contentHalves[index + 1], bottomSlot);
      }
    }
  }

  const font = await finalDoc.embedFont(StandardFonts.HelveticaBold);
  pages.forEach((page, index) => {
    drawPageFooter(
      page,
      font,
      fields.studentName,
      index + 1,
      pages.length,
      A4_WIDTH,
      PAGE_MARGIN,
      FOOTER_BOTTOM_MARGIN
    );
  });
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
       ORDER BY weekId ASC`,
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
