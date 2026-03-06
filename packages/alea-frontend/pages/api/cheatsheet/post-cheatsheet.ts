import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeTxnAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import jsQR from 'jsqr';
import { isUserIdAuthorizedForAny } from '../access-control/resource-utils';
import { Action, ResourceName } from '@alea/utils';
import { getCheatSheetConfigOrSet500OnError } from './create-cheatsheet';

pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.js');
const CHEATSHEETS_DIR = process.env.CHEATSHEETS_DIR;

export const config = { api: { bodyParser: false } };

interface QRData {
  cheatsheetId: string;
}
interface ExtractedFields {
  cheatsheetId?: string;
  studentName?: string;
  studentId?: string;
  weekId?: string;
  instanceId?: string;
  courseId?: string;
  universityId?: string;
}

function generateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8);
}

function verifyQRSignature(payload: string, signature: string): boolean {
  const SECRET_KEY = process.env.CHEATSHEET_QR_SECRET;
  if (!SECRET_KEY) throw new Error('CHEATSHEET_QR_SECRET is not configured.');
  const expected = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
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
      sanitize(fields.universityId as string),
      sanitize(fields.courseId as string),
      sanitize(fields.instanceId as string),
      fields.studentId,
      sanitize(fields.weekId as string),
      checksum,
    ].join('-') + '.pdf'
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
  const qr = await extractQRFromPDF(buffer);

  const fields: ExtractedFields = {
    cheatsheetId: qr.cheatsheetId,
  };

  return { fields, diagnostics: 'QR: ok' };
}

function savePDF(filepath: string, cheatsheetDir: string, fileName: string): void {
  const dest = path.join(cheatsheetDir, fileName);
  if (fs.existsSync(dest)) {
    fs.unlinkSync(dest);
  }
  fs.renameSync(filepath, dest);
}
async function extractQRFromPDF(buffer: Buffer): Promise<QRData> {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) } as any).promise;

  for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 3); pageNum++) {
    const page = await pdf.getPage(pageNum);
    const opList = await page.getOperatorList();
    const objs: any = (page as any).objs;
    const imgNames: string[] = [];

    for (let i = 0; i < opList.fnArray.length; i++) {
      const op = opList.fnArray[i];
      if (
        op === pdfjsLib.OPS.paintImageXObject ||
        op === pdfjsLib.OPS.paintImageXObjectRepeat ||
        op === pdfjsLib.OPS.paintInlineImageXObject
      ) {
        const name = opList.argsArray[i]?.[0];
        if (name && !imgNames.includes(name)) imgNames.push(name);
      }
    }

    for (const name of imgNames) {
      const img: any = await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error(`Timeout waiting for image obj: ${name}`)),
          5000
        );
        try {
          objs.get(name, (obj: any) => {
            clearTimeout(timeout);
            resolve(obj);
          });
        } catch (e) {
          clearTimeout(timeout);
          reject(e);
        }
      }).catch((err) => {
        console.warn(`Could not get image obj "${name}":`, err);
        return null;
      });

      if (!img?.width || !img?.height || !img?.data) {
        console.warn(`Skipping image "${name}": missing width/height/data`);
        continue;
      }

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

        const rgba = await sharp(raw, { raw: { width, height, channels: ch as 1 | 2 | 3 | 4 } })
          .toColorspace('srgb')
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
            const outer = JSON.parse(result.data) as { payload: string; signature: string };
            if (!verifyQRSignature(outer.payload, outer.signature)) {
              throw new Error('QR signature verification failed — file may be tampered.');
            }
            const json = JSON.parse(outer.payload) as Record<string, string>;
            return {
              cheatsheetId: json['cheatsheetId'] ?? undefined,
            };
          }
        }

        console.warn(`No QR detected in image "${name}" on page ${pageNum} at any scale.`);
      } catch (err) {
        console.warn(`Failed to decode QR from image "${name}" on page ${pageNum}:`, err);
      }
    }
  }

  throw new Error(`No QR code found across first ${Math.min(pdf.numPages, 3)} page(s).`);
}

const WINDOW_START_DAY = 1;
const WINDOW_END_DAY = 0;
//allowing on all days by default
function isWithinDefaultUploadWindow(): boolean {
  const now = new Date();
  const day = now.getDay();
  const inWindow =
    WINDOW_START_DAY <= WINDOW_END_DAY
      ? day >= WINDOW_START_DAY && day <= WINDOW_END_DAY
      : day >= WINDOW_START_DAY || day <= WINDOW_END_DAY;

  return inWindow;
}

async function validateUploadWindowOrSetError(
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
    const start = new Date(result[0].uploadStartAt);
    const end = new Date(result[0].uploadEndAt);
    if (now < start || now > end) {
      res.status(403).send('Empty cheatsheet generation window is closed');
      return false;
    }
    return true;
  }
  if (!isWithinDefaultUploadWindow()) {
    res.status(403).send('Upload window is closed');
    return false;
  }
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  if (!CHEATSHEETS_DIR) return res.status(500).send('CHEATSHEETS_DIR is not configured.');
  fs.mkdirSync(CHEATSHEETS_DIR, { recursive: true });
  let file: formidable.File;
  try {
    file = await parseUpload(req);
  } catch (err: unknown) {
    return res.status(400).send((err as Error)?.message ?? 'Failed to parse form.');
  }
  const buffer = fs.readFileSync(file.filepath);

  let fields: ExtractedFields, diagnostics: string;
  try {
    ({ fields, diagnostics } = await extractFields(buffer));
  } catch (err) {
    console.error('Error extracting fields:', err);
    return res.status(500).send('Failed to extract fields.');
  }
  const cheatsheetId = fields.cheatsheetId;
  if (!cheatsheetId) {
    return res.status(422).send('Cheatsheet ID not found in QR code.');
  }
  const cheatSheetData = await executeAndEndSet500OnError(
    `SELECT * FROM CheatSheet WHERE cheatsheetId = ?`,
    [cheatsheetId],
    res
  );
  if (!cheatSheetData) return;
  if (!cheatSheetData.length)
    return res.status(404).send('Cheatsheet record not found for extracted cheatsheetId.');
  const existingRow = cheatSheetData[0];

  const { userId: studentId, courseId, instanceId, universityId, weekId } = existingRow;
  fields.studentId = studentId;
  fields.courseId = courseId;
  fields.instanceId = instanceId;
  fields.universityId = universityId;
  fields.weekId = weekId;
  const isInstructor = await isUserIdAuthorizedForAny(userId, [
    {
      name: ResourceName.COURSE_CHEATSHEET,
      action: Action.MUTATE,
      variables: { courseId, instanceId },
    },
  ]);
  const isStudent = await isUserIdAuthorizedForAny(userId, [
    {
      name: ResourceName.COURSE_CHEATSHEET,
      action: Action.UPLOAD,
      variables: { courseId, instanceId, studentId: userId },
    },
  ]);
  if (isStudent) {
    const isValid = await validateUploadWindowOrSetError(
      universityId,
      courseId,
      instanceId,
      weekId,
      res
    );

    if (!isValid) return;
  }
  if (isStudent && studentId !== userId) {
    return res.status(403).send('You cannot upload a cheat sheet for another student.');
  }
  if (!isInstructor && !isStudent) {
    return res
      .status(403)
      .send('You do not have permission to upload cheat sheets for this course.');
  }
  const checksum = generateChecksum(buffer);
  const fileName = buildFileName(fields, userId, checksum);

  try {
    savePDF(file.filepath, CHEATSHEETS_DIR, fileName);
  } catch (err: unknown) {
    return res.status(500).send((err as Error)?.message ?? 'Failed to save PDF file.');
  }
  const finalPath = path.join(CHEATSHEETS_DIR, fileName);
  if (existingRow?.uploadedAt) {
    if (existingRow.checksum === checksum) {
      return res.status(200).send('Already uploaded.');
    }
    const txnResult = await executeTxnAndEndSet500OnError(
      res,
      `INSERT INTO CheatSheetHistory
   (cheatsheetId, uploadedVersionNumber, uploadedByUserId, checksum, fileName, uploadedAt, createdAt)
   SELECT cheatsheetId, uploadedVersionNumber, uploadedByUserId, checksum, fileName, uploadedAt, createdAt
   FROM CheatSheet
   WHERE cheatsheetId = ?`,
      [existingRow.cheatsheetId],
      `UPDATE CheatSheet
   SET checksum = ?, fileName = ?, uploadedVersionNumber = uploadedVersionNumber + 1,
       uploadedByUserId = ?, uploadedAt = NOW()
   WHERE cheatsheetId = ?`,
      [checksum, fileName, userId, existingRow.cheatsheetId]
    );

    if (!txnResult) return;
    return res.status(200).end();
  }
  const result = await executeAndEndSet500OnError(
    `UPDATE CheatSheet
   SET checksum = ?,
       fileName = ?,
       uploadedVersionNumber = ?,
       uploadedByUserId = ?,
       uploadedAt = NOW()
   WHERE cheatsheetId = ?`,
    [checksum, fileName, 1, userId, cheatsheetId],
    res
  );

  if (!result) {
    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
      return;
    }
  }
  res.status(201).end();
}
