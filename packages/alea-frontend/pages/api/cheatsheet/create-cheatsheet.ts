import type { NextApiRequest, NextApiResponse } from 'next';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import crypto from 'crypto';

import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeDontEndSet500OnError,
} from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, getCurrentWeekNoFromStartDate, ResourceName } from '@alea/utils';
import { getUserProfileOrSet500OnError } from '../get-user-profile';
import { getSemesterInfoFromDb } from '../calendar/create-calendar';

const QR_SECRET = process.env.CHEATSHEET_QR_SECRET;

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

export async function buildQrCodeSecure(data: Record<string, any>): Promise<string | null> {
  if (!QR_SECRET) {
    console.error('CHEATSHEET_QR_SECRET is not set');
    return null;
  }
  const payload = JSON.stringify(data);
  const signature = signPayload(payload, QR_SECRET);
  const finalPayload = JSON.stringify({ payload, signature });
  return QRCode.toDataURL(finalPayload);
}

export function generateWeekIdFromSemesterStart(semesterStart: string) {
  const weekNumber = getCurrentWeekNoFromStartDate(semesterStart);
  return `W${weekNumber}`;
}

export function drawWatermark(doc: PDFDocument, fields: CheatsheetFields) {
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

export function drawHeader(
  doc: PDFDocument,
  rows: [string, string][],
  qrImage: string,
  headerTop: number,
  headerHeight: number
) {
  const { width } = doc.page;

  const LEFT_X = 25;
  const CONTENT_TOP = headerTop + 30;
  const ROW_GAP = 8;

  const QR_SIZE = 275;
  const qrX = width - QR_SIZE - 15;
  const qrY = CONTENT_TOP - 20;
  doc.rect(10, headerTop, width - 20, headerHeight).stroke();
  const textWidth = qrX - LEFT_X - 20;
  doc.fontSize(16);
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

  if (qrImage) {
    try {
      const base64Data = qrImage.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      doc.image(imageBuffer, qrX, qrY, { width: QR_SIZE });
    } catch (err) {
      console.error('QR render failed:', err);
    }
  }

  const note =
    'NOTE: Only the lower box should contain your cheatsheet. The top part is reserved for reference and will not appear after scanning.';

  doc.fontSize(10).fillColor('red');

  doc.text(note, 20, headerTop + headerHeight - 40, {
    width: width - 40,
    align: 'center',
  });
}
function drawWriteArea(doc: PDFDocument, startY: number, margin: number) {
  const { width, height } = doc.page;
  const areaHeight = height - startY - margin;
  const areaWidth = width - 2 * margin;

  doc.save();
  doc.rect(margin, startY, areaWidth, areaHeight).stroke();
  doc.restore();
}

function buildPdf(fields: CheatsheetFields, qrImage: string) {
  const PAGE_MARGIN = 10;
  const doc = new PDFDocument({
    size: 'A4',
    margin: PAGE_MARGIN,
    autoFirstPage: false,
  });
  doc.addPage();
  const { height } = doc.page;
  const HEADER_TOP = PAGE_MARGIN;
  const HEADER_HEIGHT = (height - PAGE_MARGIN * 2) / 2;
  const WRITE_AREA_TOP = HEADER_TOP + HEADER_HEIGHT + 10;
  const rows: [string, string][] = [
    ['Course Name', fields.courseName],
    ['Course Id', fields.courseId],
    ['Instance Id', fields.instanceId],
    ['University Id', fields.universityId],
    ['Student Name', fields.studentName],
    ['Student Id', fields.studentId],
    ['Week Id', fields.weekId],
    [
      'Generated At',
      new Date(fields.createdAt).toLocaleString('en-IN', {
        timeZoneName: 'short',
      }),
    ],
  ];
  drawHeader(doc, rows, qrImage, HEADER_TOP, HEADER_HEIGHT);
  drawWatermark(doc, fields);
  drawWriteArea(doc, WRITE_AREA_TOP, PAGE_MARGIN);
  return doc;
}

export async function getCheatSheetConfigOrSet500OnError(
  universityId: string,
  courseId: string,
  instanceId: string,
  weekId: string,
  res: NextApiResponse
) {
  // const result: any[] = await executeDontEndSet500OnError(
  //   `SELECT generationStartAt, generationEndAt, uploadStartAt, uploadEndAt FROM CheatSheetConfig
  //   WHERE universityId = ? AND courseId = ? AND instanceId = ? AND weekId = ?`,
  //   [universityId, courseId, instanceId, weekId],
  //   res
  // );
  // if (!result) return;
  // return result;
  return [];
}

async function validateGenerationWindowOrSetError(
  universityId: string,
  courseId: string,
  instanceId: string,
  weekId: string,
  res: NextApiResponse
): Promise<boolean> {
  const result = await getCheatSheetConfigOrSet500OnError(
    universityId,
    courseId,
    instanceId,
    weekId,
    res
  );
  if (!result) return false;
  if (result.length) {
    const now = new Date();
    const start = new Date(result[0].generationStartAt);
    const end = new Date(result[0].generationEndAt);
    if (now < start || now > end) {
      res.status(403).send('Empty cheatsheet generation window is closed');
      return false;
    }
  }
  return true;
}
function generateId() {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return (time + random).slice(-8);
}
function toMySQLDatetime(date: Date = new Date()) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
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

    const semesterInfo = await getSemesterInfoFromDb(universityId, instanceId);
    if (!semesterInfo?.semesterStart) {
    return res.status(400).send('Semester start date not found, cannot generate week id');
    }
    const weekId = generateWeekIdFromSemesterStart(semesterInfo.semesterStart);
    fields.weekId = weekId;
    const allowed = await validateGenerationWindowOrSetError(
      universityId,
      courseId,
      instanceId,
      weekId,
      res
    );
    if (!allowed) return;
    const existing = await executeAndEndSet500OnError(
      `SELECT cheatsheetId, createdAt
   FROM CheatSheet
   WHERE userId=? AND courseId=? AND instanceId=? AND universityId=? AND weekId=?
   LIMIT 1`,
      [userId, courseId, instanceId, universityId, weekId],
      res
    );
    if (!existing) return;

    let cheatsheetId;
    let createdAt;

    if (existing.length > 0) {
      cheatsheetId = existing[0].cheatsheetId;
      createdAt = existing[0].createdAt;
    } else {
      cheatsheetId = generateId();
      createdAt = new Date();

      const result = await executeDontEndSet500OnError(
        `INSERT INTO CheatSheet
    (cheatsheetId, userId, studentName, universityId, courseId, instanceId, weekId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cheatsheetId,
          userId,
          studentName,
          universityId,
          courseId,
          instanceId,
          weekId,
          toMySQLDatetime(createdAt),
        ],
        res
      );
      if (!result) return;
    }
    fields.createdAt = createdAt;
    const qrImage = await buildQrCodeSecure({ cheatsheetId });
    if (!qrImage) {
      return res.status(500).send('QR generation failed');
    }
    const doc = buildPdf(fields, qrImage);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cheatsheet-${fields.weekId}-${fields.courseId}.pdf"`
    );
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to generate cheatsheet' });
  }
}
