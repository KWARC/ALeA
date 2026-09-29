import { createHmac } from 'node:crypto';
import {
  degrees,
  PDFDocument as PdfLibDocument,
  PDFEmbeddedPage,
  PDFFont,
  PDFPage,
  rgb,
  StandardFonts,
} from 'pdf-lib';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { rotationWithUprightCorrection, uprightRotationsForPdf } from './cheatsheet-orientation';

type PdfKitDoc = InstanceType<typeof PDFDocument>;

export interface CheatsheetFields {
  courseName: string;
  courseId: string;
  instanceId: string;
  universityId: string;
  studentName: string;
  studentId: string;
  weekId: string;
  createdAt: string;
}

export interface CheatsheetRosterRow {
  name: string;
  userId: string;
  uploadCount?: number;
  matriculationNumber?: string;
}

function signPayload(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export async function buildQrCodeSecure(
  data: Record<string, string>
): Promise<string | null> {
  const secret = process.env['CHEATSHEET_QR_SECRET'];
  if (!secret) {
    console.error('CHEATSHEET_QR_SECRET is not set');
    return null;
  }
  const payload = JSON.stringify(data);
  const signature = signPayload(payload, secret);
  const finalPayload = JSON.stringify({ payload, signature });
  return QRCode.toDataURL(finalPayload);
}

export function drawWatermark(doc: PdfKitDoc, fields: CheatsheetFields) {
  const { width, height } = doc.page;
  const text = `${fields.studentName} | ${fields.studentId} | ${fields.weekId}`;

  doc.save();
  doc.opacity(0.13);
  doc.fillColor('#878484');
  doc.fontSize(14);

  const centerX = width / 2;
  const centerY = height / 2;

  doc.rotate(-35, { origin: [centerX, centerY] });

  const textWidth = doc.widthOfString(text);
  const stepX = textWidth + 60;
  const stepY = 60;

  const diag = Math.hypot(width, height);

  for (let x = -diag; x < diag; x += stepX) {
    for (let y = -diag; y < diag; y += stepY) {
      doc.text(text, centerX + x, centerY + y, { lineBreak: false });
    }
  }

  doc.restore();
}

export function drawHeader(
  doc: PdfKitDoc,
  rows: [string, string][],
  qrImage: string,
  headerTop: number,
  headerHeight: number,
  options?: { examCode?: string; showScanNote?: boolean; matriculationNumber?: string }
) {
  const { width } = doc.page;
  const examCode = options?.examCode;
  const showScanNote = options?.showScanNote !== false;
  const matriculationNumber = options?.matriculationNumber?.trim();

  const LEFT_X = 25;
  const CONTENT_TOP = headerTop + 30;
  const ROW_GAP = 8;

  const QR_SIZE = 275;
  const qrX = width - QR_SIZE - 15;
  const qrY = CONTENT_TOP - 20;
  doc.rect(10, headerTop, width - 20, headerHeight).stroke();
  const textWidth = qrX - LEFT_X - 20;
  doc.fontSize(16).fillColor('#000');
  let y = CONTENT_TOP;
  rows.forEach(([label, value]) => {
    const text = `${label}: ${value}`;
    const textHeight = doc.heightOfString(text, {
      width: textWidth,
    });
    doc.text(text, LEFT_X, y, {
      width: textWidth,
    });
    y += textHeight + ROW_GAP;
  });

  if (matriculationNumber) {
    doc.fontSize(28).fillColor('#000');
    doc.text(`Matriculation: ${matriculationNumber}`, LEFT_X, y, {
      width: textWidth,
    });
  }

  if (examCode) {
    doc.fontSize(96).fillColor('#000');
    doc.text(examCode, qrX, qrY + 40, {
      width: QR_SIZE,
      align: 'center',
    });
  } else if (qrImage) {
    try {
      const base64Data = qrImage.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      doc.image(imageBuffer, qrX, qrY, { width: QR_SIZE });
    } catch (err) {
      console.error('QR render failed:', err);
    }
  }

  if (showScanNote) {
    const note =
      'NOTE: Only the lower box should contain your cheatsheet. The top part is reserved for reference and will not appear after scanning.';

    doc.fontSize(10).fillColor('red');

    doc.text(note, 20, headerTop + headerHeight - 40, {
      width: width - 40,
      align: 'center',
    });
  }
}

function cropForRotation(
  rotation: 0 | 90 | 180 | 270,
  width: number,
  height: number
) {
  if (rotation === 90) return { left: width / 2, bottom: 0, right: width, top: height };
  if (rotation === 180) return { left: 0, bottom: height / 2, right: width, top: height };
  if (rotation === 270) return { left: 0, bottom: 0, right: width / 2, top: height };
  return { left: 0, bottom: 0, right: width, top: height / 2 };
}

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
  pdfBuffers: Buffer[],
  options?: { examCode?: string; matriculationNumber?: string }
): Promise<Buffer> {
  const examCode = options?.examCode;
  const matriculationNumber = options?.matriculationNumber;
  const headerBuffer = await new Promise<Buffer>((resolve) => {
    const buffers: Buffer[] = [];
    const PAGE_MARGIN = 10;
    const doc = new PDFDocument({
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
    drawHeader(doc, rows, examCode ? '' : qrImage, HEADER_TOP, HEADER_HEIGHT, {
      examCode,
      showScanNote: !examCode,
      matriculationNumber,
    });
    if (!examCode) {
      drawWatermark(doc, fields);
    }
    doc.end();
  });

  const finalDoc = await PdfLibDocument.create();
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
  const headerPdf = await PdfLibDocument.load(headerBuffer);
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
    const src = await PdfLibDocument.load(buffer);
    const uprightRotations = await uprightRotationsForPdf(buffer);
    const pages = src.getPages();
    for (let index = 0; index < pages.length; index++) {
      const page = pages[index];
      const { width, height } = page.getSize();
      const rotation = rotationWithUprightCorrection(
        page.getRotation().angle,
        uprightRotations[index]
      );
      const crop = cropForRotation(rotation, width, height);

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

export async function concatPdfBuffers(buffers: Buffer[]): Promise<Buffer> {
  const out = await PdfLibDocument.create();
  const A4: [number, number] = [595.28, 841.89];
  for (const buffer of buffers) {
    const src = await PdfLibDocument.load(buffer);
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const page of pages) {
      out.addPage(page);
    }
    if (pages.length % 2 === 1) {
      out.addPage(A4);
    }
  }
  return Buffer.from(await out.save());
}

function sortRosterRows(rows: CheatsheetRosterRow[]) {
  return [...rows].sort((a, b) => {
    const nameCmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    if (nameCmp !== 0) return nameCmp;
    return a.userId.localeCompare(b.userId);
  });
}

export function buildCheatsheetRosterPdf(params: {
  courseName: string;
  courseId: string;
  instanceId: string;
  universityId: string;
  registeredWithUploads: CheatsheetRosterRow[];
  registeredNoUploads: CheatsheetRosterRow[];
  unregisteredWithUploads: CheatsheetRosterRow[];
  enrolledUnregisteredNoUploads: CheatsheetRosterRow[];
}): Promise<Buffer> {
  const registeredWithUploads = sortRosterRows(params.registeredWithUploads);
  const registeredNoUploads = sortRosterRows(params.registeredNoUploads);
  const unregisteredWithUploads = sortRosterRows(params.unregisteredWithUploads);
  const enrolledUnregisteredNoUploads = sortRosterRows(params.enrolledUnregisteredNoUploads);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 36, autoFirstPage: true });
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageBottom = () => doc.page.height - doc.page.margins.bottom;
    const contentWidth = () => doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const FONT = 8;
    const HEADER_FONT = 10;
    const TITLE_FONT = 12;
    const ROW_H = 12;

    const ensureSpace = (needed: number) => {
      if (doc.y + needed > pageBottom()) {
        doc.addPage();
      }
    };

    doc.fontSize(TITLE_FONT).fillColor('#000').text('Cheatsheet roster', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(FONT).fillColor('#333');
    doc.text(
      `${params.courseName} (${params.courseId}) · ${params.instanceId} · ${params.universityId}`
    );
    doc.moveDown(0.8);

    const drawTable = (
      title: string,
      columns: { key: string; width: number }[],
      rows: string[][]
    ) => {
      ensureSpace(ROW_H * 4);
      doc.fontSize(HEADER_FONT).fillColor('#000').text(title);
      doc.moveDown(0.25);
      const startX = doc.page.margins.left;
      const totalWidth = contentWidth();
      const colWidths = columns.map((c) => c.width * totalWidth);

      const drawRow = (cells: string[], isHeader: boolean) => {
        ensureSpace(ROW_H + 2);
        const y = doc.y;
        let x = startX;
        doc.save();
        if (isHeader) {
          doc.rect(startX, y, totalWidth, ROW_H).fill('#eeeeee');
        }
        doc.strokeColor('#999').lineWidth(0.4);
        doc.rect(startX, y, totalWidth, ROW_H).stroke();
        doc.fontSize(FONT).fillColor('#000');
        cells.forEach((cell, i) => {
          const w = colWidths[i];
          doc.rect(x, y, w, ROW_H).stroke();
          doc.text(cell, x + 3, y + 2, {
            width: w - 6,
            height: ROW_H - 2,
            ellipsis: true,
            lineBreak: false,
          });
          x += w;
        });
        doc.restore();
        doc.y = y + ROW_H;
      };

      drawRow(
        columns.map((c) => c.key),
        true
      );
      if (rows.length === 0) {
        drawRow(columns.map((_, i) => (i === 0 ? 'None' : '')), false);
      } else {
        rows.forEach((row) => drawRow(row, false));
      }
      doc.moveDown(1);
    };

    drawTable(
      `Registered for exam, with cheatsheet submissions (${registeredWithUploads.length})`,
      [
        { key: 'Name', width: 0.35 },
        { key: 'Matriculation', width: 0.2 },
        { key: 'Id', width: 0.25 },
        { key: 'Cheatsheets uploaded', width: 0.2 },
      ],
      registeredWithUploads.map((r) => [
        r.name,
        r.matriculationNumber ?? '',
        r.userId,
        String(r.uploadCount ?? 0),
      ])
    );

    drawTable(
      `Registered for exam, no cheatsheet submissions (${registeredNoUploads.length})`,
      [
        { key: 'Name', width: 0.4 },
        { key: 'Matriculation', width: 0.25 },
        { key: 'Id', width: 0.35 },
      ],
      registeredNoUploads.map((r) => [r.name, r.matriculationNumber ?? '', r.userId])
    );

    drawTable(
      `Not registered for exam, with cheatsheet submissions (${unregisteredWithUploads.length})`,
      [
        { key: 'Name', width: 0.45 },
        { key: 'Id', width: 0.35 },
        { key: 'Cheatsheets uploaded', width: 0.2 },
      ],
      unregisteredWithUploads.map((r) => [r.name, r.userId, String(r.uploadCount ?? 0)])
    );

    drawTable(
      `Enrolled in ALeA, not registered, no cheatsheets (${enrolledUnregisteredNoUploads.length})`,
      [
        { key: 'Name', width: 0.5 },
        { key: 'Id', width: 0.5 },
      ],
      enrolledUnregisteredNoUploads.map((r) => [r.name, r.userId])
    );

    doc.end();
  });
}
