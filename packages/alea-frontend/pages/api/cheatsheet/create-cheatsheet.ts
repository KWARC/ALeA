import type { NextApiRequest, NextApiResponse } from 'next';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

import { checkIfPostOrSetError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, getCurrentWeekNoFromStartDate, ResourceName } from '@alea/utils';
import { getUserProfileOrSet500OnError } from '../get-user-profile';
import { getSemesterInfoFromDb } from '../calendar/create-calendar';

const QR_SECRET = process.env.CHEATSHEET_QR_SECRET;

interface CheatsheetFields {
  courseName: string;
  courseId: string;
  instanceId: string;
  universityId: string;
  studentName: string;
  studentId: string;
  weekId: string;
  downloadDate: string;
}

function validateBody(body: Partial<CheatsheetFields>) {
  const required: (keyof CheatsheetFields)[] = [
    'courseName',
    'courseId',
    'instanceId',
    'universityId',
  ];
  return required.every((key) => Boolean(body[key]));
}

function signPayload(payload: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function buildQrCodeSecure(
  fields: CheatsheetFields,
  generationId: string
): Promise<string | null> {
  if (!QR_SECRET) {
    console.error('CHEATSHEET_QR_SECRET is not set');
    return null;
  }

  const payload = JSON.stringify({
    generationId,
    universityId: fields.universityId,
    instanceId: fields.instanceId,
    courseId: fields.courseId,
    studentId: fields.studentId,
    studentName: fields.studentName,
    weekId: fields.weekId,
    downloadDate: fields.downloadDate,
  });

  const signature = signPayload(payload, QR_SECRET);
  const finalPayload = JSON.stringify({ payload, signature });
  return QRCode.toDataURL(finalPayload);
}

export function generateWeekIdFromSemesterStart(semesterStart: string) {
  const weekNumber = getCurrentWeekNoFromStartDate(semesterStart);
  return `W${weekNumber}`;
}

function drawWatermark(doc: PDFKit.PDFDocument, fields: CheatsheetFields) {
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

  const diag = Math.sqrt(width * width + height * height);

  for (let x = -diag; x < diag; x += stepX) {
    for (let y = -diag; y < diag; y += stepY) {
      doc.text(text, centerX + x, centerY + y, { lineBreak: false });
    }
  }

  doc.restore();
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  fields: CheatsheetFields,
  qrImage: string,
  headerTop: number,
  headerHeight: number
) {
  const { width } = doc.page;
  const LEFT_X = 50;
  const LINE_HEIGHT = 18;

  doc.rect(10, headerTop, width - 20, headerHeight).stroke();

  const rows: [string, string][] = [
    ['Course Name', fields.courseName],
    ['Course Id', fields.courseId],
    ['Instance Id', fields.instanceId],
    ['University Id', fields.universityId],
    ['Student Name', fields.studentName],
    ['Student Id', fields.studentId],
    ['Week Id', fields.weekId],
    ['Downloaded At', new Date(fields.downloadDate).toLocaleString()],
  ];
  doc.fontSize(12);
  rows.forEach(([label, value], i) => {
    doc.text(`${label}: ${value}`, LEFT_X, headerTop + 35 + i * LINE_HEIGHT);
  });

  const QR_SIZE = 160;
  const qrX = width - QR_SIZE - 20;
  const qrY = headerTop + 20;

  if (qrImage) {
    try {
      const base64Data = qrImage.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      doc.image(imageBuffer, qrX, qrY, { width: QR_SIZE });
    } catch (err) {
      console.error('QR render failed:', err);
    }
  }

  const note = 'NOTE: Only the lower box should contain your cheatsheet. The top part is reserved for reference and will not appear after scanning.';
  doc.fontSize(10).fillColor('red');
  doc.text(note, 20, headerTop + headerHeight - 40, { width: width - 40, align: 'center' });
}
function drawWriteArea(doc: PDFKit.PDFDocument, startY: number, margin: number) {
  const { width, height } = doc.page;
  const areaHeight = height - startY - margin;
  const areaWidth = width - 2 * margin;

  doc.save();
  doc.rect(margin, startY, areaWidth, areaHeight).stroke();
  doc.restore();
}

function buildPdf(fields: CheatsheetFields, qrImage: string) {
  const PAGE_MARGIN = 10;
  const HEADER_HEIGHT = 320;
  const HEADER_TOP = PAGE_MARGIN;
  const WRITE_AREA_TOP = HEADER_TOP + HEADER_HEIGHT + 10;

  const doc = new PDFDocument({
    size: 'A4',
    margin: PAGE_MARGIN,
    autoFirstPage: false,
  });

  doc.addPage();
  drawHeader(doc, fields, qrImage, HEADER_TOP, HEADER_HEIGHT);
  drawWatermark(doc, fields);
  drawWriteArea(doc, WRITE_AREA_TOP, PAGE_MARGIN);

  return doc;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  if (!validateBody(req.body)) {
    return res.status(422).send('Missing required fields');
  }
  const { courseId, instanceId, universityId } = req.body;
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_CHEATSHEET,
    Action.UPLOAD,
    { courseId, instanceId }
  );
  if (!userId) return;
  const userProfile = await getUserProfileOrSet500OnError(userId, res);
  if (!userProfile) return;
  const { firstName = '', lastName = '' } = userProfile[0] ?? {};
  const studentName = firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Unknown';

  try {
    const fields = req.body as CheatsheetFields;
    fields.studentName = studentName;
    fields.studentId = userId;
    fields.downloadDate = new Date().toISOString();

    const semesterInfo = { semesterStart: '2025-10-01' };
    // const semesterInfo = await getSemesterInfoFromDb(universityId, instanceId);
    // if (!semesterInfo?.semesterStart) {
    //   return res.status(400).send('Semester start date not found, cannot generate week id');
    // }
    fields.weekId = generateWeekIdFromSemesterStart(semesterInfo.semesterStart);
    const generationId = uuidv4();
    const qrImage = await buildQrCodeSecure(fields, generationId);
    if (!qrImage) {
      return res.status(500).send('QR generation failed');
    }
    const doc = buildPdf(fields, qrImage);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cheatsheet-${fields.weekId}.pdf"`);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to generate cheatsheet' });
  }
}
