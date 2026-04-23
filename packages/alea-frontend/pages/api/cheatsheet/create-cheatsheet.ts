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
import {
  Action,
  formatDateLabel,
  getCurrentWeekNoFromStartDate,
  ResourceName,
  toWeekdayIndex,
} from '@alea/utils';
import { getUserProfileOrSet500OnError } from '../get-user-profile';
import { getCheatsheetConfigOrSetError } from './post-cheatsheet';
import { CheatsheetConfig } from '@alea/spec';
import {
  getCheatsheetWeekStarts,
  getSkippedWeeksSet,
  getUploadWindow,
  getWeekStartFromDate,
} from './get-cheatsheet-upload-window';

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

function buildPdf() {
  const PAGE_MARGIN = 10;
  return new PDFDocument({
    size: 'A4',
    margin: PAGE_MARGIN,
    autoFirstPage: false,
  });
}

function renderPdfPage(
  doc: PDFDocument,
  fields: CheatsheetFields,
  qrImage: string,
  config: CheatsheetConfig
) {
  const PAGE_MARGIN = 10;
  doc.addPage();
  const { height } = doc.page;
  const HEADER_TOP = PAGE_MARGIN;
  const HEADER_HEIGHT = (height - PAGE_MARGIN * 2) / 2;
  const WRITE_AREA_TOP = HEADER_TOP + HEADER_HEIGHT + 10;
  const uploadWindow = getUploadWindow(new Date(fields.weekId), config);
  const weekOf = `${formatDateLabel(uploadWindow.windowStart)} - ${formatDateLabel(
    uploadWindow.windowEnd
  )}`;
  const rows: [string, string][] = [
    ['Course Name', fields.courseName],
    ['Course Id', fields.courseId],
    ['Instance Id', fields.instanceId],
    ['University Id', fields.universityId],
    ['Student Name', fields.studentName],
    ['Student Id', fields.studentId],
    ['Week Of', weekOf],
  ];
  drawHeader(doc, rows, qrImage, HEADER_TOP, HEADER_HEIGHT);
  drawWatermark(doc, fields);
  drawWriteArea(doc, WRITE_AREA_TOP, PAGE_MARGIN);
}

function generateId() {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return (time + random).slice(-8);
}
function toMySQLDatetime(date: Date = new Date()) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}
async function getOrCreateCheatsheetOrSetError({
  userId,
  studentName,
  universityId,
  courseId,
  instanceId,
  weekId,
  res,
}) {
  const existing = await executeAndEndSet500OnError(
    `SELECT cheatsheetId, createdAt
     FROM CheatSheet
     WHERE userId=? AND courseId=? AND instanceId=? AND universityId=? AND weekId=?
     LIMIT 1`,
    [userId, courseId, instanceId, universityId, weekId],
    res
  );
  if (!existing) return;
  if (existing.length > 0) {
    return { cheatsheetId: existing[0].cheatsheetId, createdAt: existing[0].createdAt };
  }
  const cheatsheetId = generateId();
  const createdAt = new Date();

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
  return { cheatsheetId, createdAt };
}

function getEffectiveWeekStart(now: Date, config: CheatsheetConfig): Date {
  const startDayNum =
    typeof config.uploadStartDay === 'string'
      ? toWeekdayIndex(config.uploadStartDay)
      : config.uploadStartDay;
  const [startH, startM] = config.uploadStartTime.split(':').map(Number);
  const base = getWeekStartFromDate(now, startDayNum);
  const weekStart = new Date(base);
  weekStart.setHours(startH, startM, 0, 0);
  if (now < weekStart) {
    const prev = new Date(weekStart);
    prev.setUTCDate(prev.getUTCDate() - 7);
    return prev;
  }
  return weekStart;
}

function toSafeLabel(str: string) {
  return str.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');//Converts string into a URL-safe label by replacing spaces with hyphens and removing special characters
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  if (!validateBody(req.body)) {
    return res.status(422).send('Missing required fields');
  }
  const { courseId, instanceId, universityId, scope = 'WEEK' } = req.body;
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
    const config = await getCheatsheetConfigOrSetError(universityId, courseId, instanceId, res);
    if (!config) return;
    if (!config.cheatsheetStart || !config.cheatsheetEnd) {
      return res.status(403).send('Cheatsheet start or end date not found.');
    }
    const weekStarts = getCheatsheetWeekStarts(config);
    const skippedWeeks = getSkippedWeeksSet(config);
    const doc = buildPdf();
    if (scope === 'WEEK') {
      const weekStart = getEffectiveWeekStart(new Date(), config);
      const weekId = weekStart.toISOString().split('T')[0];
      fields.weekId = weekId;
      const { cheatsheetId, createdAt } = await getOrCreateCheatsheetOrSetError({
        userId,
        studentName,
        universityId,
        courseId,
        instanceId,
        weekId,
        res,
      });
      if (!cheatsheetId) return;
      fields.createdAt = createdAt;

      const qrImage = await buildQrCodeSecure({ cheatsheetId });
      if (!qrImage) return res.status(500).send('QR generation failed');

      renderPdfPage(doc, fields, qrImage, config);
    } else {
      for (const weekStart of weekStarts) {
        const weekId = weekStart.toISOString().split('T')[0];
        if (skippedWeeks.has(weekId)) continue;
        fields.weekId = weekId;
        const { cheatsheetId, createdAt } = await getOrCreateCheatsheetOrSetError({
          userId,
          studentName,
          universityId,
          courseId,
          instanceId,
          weekId,
          res,
        });
        if (!cheatsheetId) continue;
        fields.createdAt = createdAt;
        const qrImage = await buildQrCodeSecure({ cheatsheetId });
        if (!qrImage) continue;
        renderPdfPage(doc, fields, qrImage, config);
      }
    }
    let filename: string;

    if (scope === 'WEEK') {
      const weekStart = getEffectiveWeekStart(new Date(), config);
      const { windowStart, windowEnd } = getUploadWindow(weekStart, config);
      const label = `${formatDateLabel(windowStart)}-${formatDateLabel(windowEnd)}`;
      const safeRange = toSafeLabel(label);
      filename = `cheatsheet-${safeRange}-${courseId}.pdf`;
    } else {
      const validWeeks = weekStarts.filter((w) => !skippedWeeks.has(formatDateLabel(w)));
      const firstWeek = validWeeks[0];
      const lastWeek = validWeeks[validWeeks.length - 1];
      const firstWindow = getUploadWindow(firstWeek, config);
      const lastWindow = getUploadWindow(lastWeek, config);
      const label = `${formatDateLabel(firstWindow.windowStart)}-${formatDateLabel(
        lastWindow.windowEnd
      )}`;
      const safeRange = toSafeLabel(label);
      filename = `cheatsheet-${safeRange}-${courseId}.pdf`;
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to generate cheatsheet' });
  }
}
