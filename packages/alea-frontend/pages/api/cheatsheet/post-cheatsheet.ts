import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import jsQR from 'jsqr';

pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.js');
const CHEATSHEETS_DIR = process.env.CHEATSHEETS_DIR;

export const config = { api: { bodyParser: false } };

interface QRData {
  courseId: string;
  downloadDate: string;
  instanceId: string;
  universityId: string;
  studentId: string;
  studentName?: string;
  weekId: string;
}

interface WatermarkFields {
  studentName?: string;
  weekId?: string;
  instanceId?: string;
  courseId?: string;
  universityId?: string;
  dateOfDownload?: string;
}

interface ExtractedFields {
  studentName?: string;
  weekId?: string;
  instanceId?: string;
  courseId?: string;
  universityId?: string;
  dateOfDownload?: string;
}

function generateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8);
}

function sanitize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
} // convert to lowercase, replace non-alphanumerics with "-", collapse duplicates, trim edge "-"

function buildFileName(fields: ExtractedFields, userId: string, checksum: string): string {
  return (
    [
      sanitize(fields.instanceId as string),
      userId,
      sanitize(fields.weekId as string),
      checksum,
    ].join('_') + '.pdf'
  );
}

async function parseUpload(req: NextApiRequest): Promise<formidable.File> {
  return new Promise((resolve, reject) => {
    formidable({ keepExtensions: true }).parse(req, (err, _fields, files) => {
      if (err) return reject(err);
      const uploaded = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!uploaded) return reject(new Error('No file uploaded.'));
      resolve(uploaded);
    });
  });
}

async function extractFields(
  buffer: Buffer
): Promise<{ fields: ExtractedFields; diagnostics: string }> {
  const [qrResult, wmResult] = await Promise.allSettled([
    extractQRFromPDF(buffer),
    extractPDFText(buffer).then(parseWatermark),
  ]);

  const qr = qrResult.status === 'fulfilled' ? qrResult.value : ({} as QRData);
  const wm: WatermarkFields = wmResult.status === 'fulfilled' ? wmResult.value : {};

  const fields: ExtractedFields = {
    courseId: qr.courseId ?? wm.courseId,
    instanceId: qr.instanceId ?? wm.instanceId,
    universityId: qr.universityId ?? wm.universityId,
    studentName: qr.studentName ?? wm.studentName,
    weekId: qr.weekId ?? wm.weekId,
    dateOfDownload: qr.downloadDate ?? wm.dateOfDownload,
  };

  const diagnostics = [
    qrResult.status === 'rejected' ? `QR error: ${(qrResult.reason as Error)?.message}` : 'QR: ok',
    wmResult.status === 'rejected'
      ? `Watermark error: ${(wmResult.reason as Error)?.message}`
      : 'Watermark: ok',
  ].join(' | ');

  return { fields, diagnostics };
}

function savePDF(filepath: string, cheatsheetDir: string, fileName: string): boolean {
  const dest = path.join(cheatsheetDir, fileName);
  const prefix = fileName.replace(/_&[^.]+\.pdf$/, ''); //Remove a trailing _&<text>.pdf suffix from the filename.
  const existing = fs.readdirSync(cheatsheetDir).find((f) => f.startsWith(prefix));
  if (existing) fs.unlinkSync(path.join(cheatsheetDir, existing));
  fs.renameSync(filepath, dest);
  return !!existing;
}

async function extractQRFromPDF(buffer: Buffer): Promise<QRData> {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) } as any).promise;
  const page = await pdf.getPage(1);
  const opList = await page.getOperatorList();
  const objs: any = (page as any).objs;
  const imgNames: string[] = [];
  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] === 85 || opList.fnArray[i] === 86) {
      const name = opList.argsArray[i]?.[0];
      if (name && !imgNames.includes(name)) imgNames.push(name);
    }
  }

  for (const name of imgNames) {
    const img: any = await new Promise((resolve) => objs.get(name, resolve));
    if (!img?.width || !img?.height || !img?.data) continue;

    try {
      const { width, height, data } = img;
      const pixelCount = width * height;
      const naiveCh = data.length / pixelCount;

      let ch = 0,
        hasPad = false;
      if (Number.isInteger(naiveCh) && naiveCh >= 1 && naiveCh <= 4) {
        ch = naiveCh;
      } else {
        for (const c of [1, 3, 4]) {
          if (data.length === height * (width * c + 1)) {
            ch = c;
            hasPad = true;
            break;
          }
        }
        if (!ch) ch = Math.max(1, Math.round(naiveCh));
      }

      let raw = Buffer.from(data instanceof Uint8Array ? data : data.buffer);
      if (hasPad) {
        const stride = width * ch + 1;
        const stripped = Buffer.alloc(pixelCount * ch);
        for (let row = 0; row < height; row++) {
          raw.copy(stripped, row * width * ch, row * stride + 1, row * stride + 1 + width * ch);
        }
        raw = stripped;
      }

      const rgba =
        ch === 4
          ? raw
          : await sharp(raw, { raw: { width, height, channels: ch as 1 | 2 | 3 } })
              .ensureAlpha()
              .raw()
              .toBuffer();

      for (const scale of [1, 2, 4]) {
        let buf = rgba,
          w = width,
          h = height;
        if (scale > 1) {
          buf = await sharp(rgba, { raw: { width, height, channels: 4 } })
            .resize(width * scale, height * scale, { kernel: 'nearest' })
            .raw()
            .toBuffer();
          w = width * scale;
          h = height * scale;
        }
        const result = jsQR(
          new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.byteLength),
          w,
          h
        );
        if (result) {
          const json = JSON.parse(result.data) as Record<string, string>;
          return {
            courseId: json['courseId'] ?? undefined,
            downloadDate: json['downloadDate'] ?? json['downloadedAt'] ?? undefined,
            instanceId: json['instanceId'] ?? undefined,
            universityId: json['universityId'] ?? undefined,
            studentId: json['studentId'] ?? undefined,
            studentName: json['studentName'] ?? undefined,
            weekId: json['weekId'] ?? json['quizId'] ?? undefined,
          };
        }
      }
    } catch (err) {
      console.warn(`Failed to decode QR code from image ${name}, trying next if available.`, err);
    }
  }

  throw new Error(`No QR code found among ${imgNames.length} image(s) on page 1.`);
}

interface PDFTextItem {
  str: string;
}

async function extractPDFText(buffer: Buffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const texts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    texts.push(content.items.map((item) => (item as PDFTextItem).str).join(' '));
  }
  return texts.join('\n');
}

function extractLabeledField(text: string, label: string): string | undefined {
  const match = text.match(
    new RegExp(`${label}\\s*:\\s*([^\\n\\r]+?)(?=\\s{2,}|\\s*[A-Z][a-z]+ (?:Name|Id|At):|$)`, 'im')
  ); //extracts the value of a labeled field (like "Course Id: ...") and stops before the next label or line break.
  return match?.[1].trim();
}

function parseWatermark(text: string): WatermarkFields {
  return {
    studentName: extractLabeledField(text, 'Student Name'),
    weekId: extractLabeledField(text, 'Quiz Id'),
    instanceId: extractLabeledField(text, 'Instance Id'),
    courseId: extractLabeledField(text, 'Course Id'),
    universityId: extractLabeledField(text, 'University Id'),
    dateOfDownload: extractLabeledField(text, 'Downloaded At'),
  };
}

const WINDOW_START_DAY = 1;
const WINDOW_END_DAY = 0;

function isWithinUploadWindow(): boolean {
  const now = new Date();
  const day = now.getDay();
  const inWindow =
    WINDOW_START_DAY <= WINDOW_END_DAY
      ? day >= WINDOW_START_DAY && day <= WINDOW_END_DAY
      : day >= WINDOW_START_DAY || day <= WINDOW_END_DAY;

  return inWindow;
}

function uploadWindowDescription(): string {
  return 'Monday 12:00 AM - Sunday 11:59:59 PM';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  console.log({userId})
  const isInstructor = req.headers['x-is-instructor'] === 'true';
  if (!isInstructor && !isWithinUploadWindow()) {
    return res
      .status(403)
      .send(
        `Cheat sheet uploads are only accepted during the active week (${uploadWindowDescription()}). ` +
          `The upload window is currently closed.`
      );
  }
  if (!CHEATSHEETS_DIR) return res.status(500).send('CHEATSHEETS_DIR is not configured.');
  fs.mkdirSync(CHEATSHEETS_DIR, { recursive: true });
console.log("he")
  let file: formidable.File;
  try {
    file = await parseUpload(req);
    console.log({file})
  } catch (err: unknown) {
    return res.status(400).send((err as Error)?.message ?? 'Failed to parse form.');
  }
  const buffer = fs.readFileSync(file.filepath);
  const { fields, diagnostics } = await extractFields(buffer);
  console.log({ fields, diagnostics });
  const missing = (
    ['courseId', 'instanceId', 'universityId', 'weekId', 'studentId', 'downloadDate'] as const
  ).filter((k) => !fields[k]);

  if (missing.length > 0) {
    return res
      .status(400)
      .send(`Could not extract required fields (${missing.join(', ')}). ${diagnostics}`);
  }

  const checksum = generateChecksum(buffer);
  console.log({checksum})
  const fileName = buildFileName(fields, userId, checksum);
  console.log({fileName})

  let isReplacement: boolean;
  try {
    isReplacement = savePDF(file.filepath, CHEATSHEETS_DIR, fileName);
  } catch (err: unknown) {
    return res.status(500).send((err as Error)?.message ?? 'Failed to save PDF file.');
  }
  const finalPath = path.join(CHEATSHEETS_DIR, fileName);
  const existing = await executeAndEndSet500OnError(
    `SELECT id, checksum , fileName FROM CheatSheet
     WHERE userId = ? AND instanceId = ? AND courseId = ? AND universityId = ? AND weekId = ?
     LIMIT 1`,
    [userId, fields.instanceId, fields.courseId, fields.universityId, fields.weekId],
    res
  );
  console.log({existing});
  if (!existing) return;
  const rows = existing as { id: number; checksum: string; fileName: string }[];
  const existingRow = rows[0];

  if (existingRow) {
    if (existingRow.checksum === checksum) {
      return res.status(200).send('Already uploaded.');
    }
    const baseDir = path.resolve(CHEATSHEETS_DIR);
    const targetPath = path.resolve(baseDir, existingRow.fileName);
    if (!targetPath.startsWith(baseDir + path.sep)) {
      console.error('Path traversal attempt detected:', targetPath);
      return res.status(400).send('Invalid file path.');
    }

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    const updated = await executeAndEndSet500OnError(
      `UPDATE CheatSheet SET checksum = ?,fileName = ? WHERE id = ?`,
      [checksum, fileName, existingRow.id],
      res
    );
    if (!updated) {
      if (fs.existsSync(finalPath)) {
        fs.unlinkSync(finalPath);
        return;
      }
    }
    return res.status(200).end();
  }
console.log("hey")
  const inserted = await executeAndEndSet500OnError(
    `INSERT INTO CheatSheet
       (userId, studentName, weekId, instanceId, courseId, universityId, checksum, fileName, dateOfDownload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      fields.studentName ?? null,
      fields.weekId,
      fields.instanceId,
      fields.courseId,
      fields.universityId,
      checksum,
      fileName,
      fields.dateOfDownload ?? null,
    ],
    res
  );

  if (!inserted) {
    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
      return;
    }
  }
  res.status(201).end();
}
