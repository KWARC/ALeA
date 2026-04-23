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
import { Action, formatDateLabel, ResourceName } from '@alea/utils';
import { getUploadWindow } from './get-cheatsheet-upload-window';
import { CheatsheetConfig } from '@alea/spec';

pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.js');
const CHEATSHEETS_DIR = process.env.CHEATSHEETS_DIR;
const TEMP_CHEATSHEETS_DIR = path.resolve(
  process.env.TEMP_CHEATSHEETS_DIR || path.join(process.cwd(), 'cheatsheets_temp')
);

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
    formidable({ keepExtensions: true, uploadDir: TEMP_CHEATSHEETS_DIR }).parse(req, (err, _fields, files) => {
      if (err) return reject(err);
      const uploaded = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!uploaded) return reject(new Error('No file uploaded.'));
      resolve(uploaded);
    });
  });
}

async function extractQRFromImage(buffer: Buffer): Promise<QRData> {
  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Could not determine image dimensions');
    }

    const rgba = await sharp(buffer)
      .toColorspace('srgb')
      .ensureAlpha()
      .raw()
      .toBuffer();

    const { width, height } = metadata;

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

    throw new Error('No QR code found in image at any scale.');
  } catch (err) {
    throw new Error(`Failed to extract QR from image: ${(err as Error)?.message}`);
  }
}

async function extractFields(
  buffer: Buffer,
  mimetype?: string
): Promise<{ fields: ExtractedFields; diagnostics: string }> {
  const pdfMagicBytes = buffer.subarray(0, 4).toString('hex') === '25504446'; 
  const isPDF = pdfMagicBytes || mimetype?.toLowerCase().includes('pdf');

  console.log('extractFields - mimetype:', mimetype, 'pdfMagicBytes:', pdfMagicBytes, 'isPDF:', isPDF);

  let qr: QRData;
  try {
    if (isPDF) {
      console.log('Processing as PDF');
      qr = await extractQRFromPDF(buffer);
    } else {
      console.log('Processing as Image');
      qr = await extractQRFromImage(buffer);
    }
  } catch (err) {
    console.error('QR extraction error:', err);
    throw err;
  }

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
          let detectionBuf = buf;
          let detectionW = w;
          let detectionH = h;
          
          if (w > 1000 || h > 1000) {
            console.log(`Downscaling large image from ${w}x${h} for jsQR`);
            const maxDim = Math.max(w, h);
            const scaleFactor = Math.max(1, Math.ceil(maxDim / 800));
            const newW = Math.floor(w / scaleFactor);
            const newH = Math.floor(h / scaleFactor);
            
            detectionBuf = await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
              .resize(newW, newH, { kernel: 'nearest' })
              .raw()
              .toBuffer();
            detectionW = newW;
            detectionH = newH;
          }

          console.log(`Scale ${scale} - Detection dimensions: ${detectionW}x${detectionH}`);

          const result = jsQR(
            new Uint8ClampedArray(detectionBuf.buffer, detectionBuf.byteOffset, detectionBuf.byteLength),
            detectionW,
            detectionH
          );

          console.log(`jsQR result at scale ${scale}:`, result ? 'FOUND!' : 'Not found');

          if (result) {
            console.log(`QR detected at scale ${scale}!`);
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

function buildCheatsheetUploadErrorMessage(
  uploadContext: UploadContext,
  weekId: string
) {
  const start = formatDateLabel(new Date(uploadContext.windowStart));
  const end = formatDateLabel(new Date(uploadContext.windowEnd));
  const weekLabel = formatDateLabel(weekId);
  if (uploadContext.status === 'PAST') {
    return `Cheatsheet submission window is closed.\nThis cheatsheet is for the week of  (${weekLabel}). Upload window was: ${start} - ${end}. Please contact instructor if you need to submit this cheatsheet.`;
  }
  if (uploadContext.status === 'FUTURE') {
    return `Submission not started for week (${weekLabel}). It will open from ${start} to ${end}.`;
  }
  return '';
}

type UploadWindowStatus = 'PAST' | 'CURRENT' | 'FUTURE';
interface UploadContext {
  windowStart: string; // ISO
  windowEnd: string; // ISO
  status: UploadWindowStatus;
}

export function getUploadContext(weekId: string | Date, config: CheatsheetConfig): UploadContext {
  const weekDate = typeof weekId === 'string' ? new Date(weekId) : weekId;
  const { windowStart, windowEnd } = getUploadWindow(weekDate, config);
  const now = new Date();
  let status: UploadWindowStatus;
  if (now < windowStart) {
    status = 'FUTURE';
  } else if (now > windowEnd) {
    status = 'PAST';
  } else {
    status = 'CURRENT';
  }
  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    status,
  };
}

export async function validateCheatsheetUploadWindowOrSetError(
  universityId: string,
  courseId: string,
  instanceId: string,
  weekId: string,
  res: NextApiResponse
) {
  const config = await getCheatsheetConfigOrSetError(universityId, courseId, instanceId, res);
  if (!config) return;

  if (!config.canStudentUploadCheatsheet) {
    return res.status(403).send('Cheatsheet upload is not enabled for this course.');
  }
  const uploadContext = getUploadContext(weekId, config);
  if (uploadContext.status !== 'CURRENT') {
    const errorMessage = buildCheatsheetUploadErrorMessage(
      uploadContext,
      weekId,
    );
    return res.status(403).send(errorMessage);
  }
  return true;
}

export async function getCheatsheetConfigOrSetError(
  universityId: string,
  courseId: string,
  instanceId: string,
  res: NextApiResponse
) {
  const result = await executeAndEndSet500OnError(
    `SELECT cheatsheetConfig FROM courseMetadata 
     WHERE courseId = ? AND instanceId = ? AND universityId = ?`,
    [courseId, instanceId, universityId],
    res
  );
  if (!result) return;

  if (!result.length || !result[0].cheatsheetConfig) {
    return res.status(403).send('Cheatsheet upload configuration is not set for this course.');
  }

  try {
    return typeof result[0].cheatsheetConfig === 'string'
      ? JSON.parse(result[0].cheatsheetConfig)
      : result[0].cheatsheetConfig;
  } catch {
    return res.status(403).send('Invalid cheatsheet configuration.');
  }
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  if (!CHEATSHEETS_DIR) return res.status(500).send('CHEATSHEETS_DIR is not configured.');
  fs.mkdirSync(CHEATSHEETS_DIR, { recursive: true });
  fs.mkdirSync(TEMP_CHEATSHEETS_DIR, { recursive: true });
  let file: formidable.File;
  try {
    file = await parseUpload(req);
  } catch (err: unknown) {
    return res.status(400).send((err as Error)?.message ?? 'Failed to parse form.');
  }
  const buffer = fs.readFileSync(file.filepath);

  let fields: ExtractedFields, diagnostics: string;
  try {
    ({ fields, diagnostics } = await extractFields(buffer, file.mimetype));
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
      variables: { courseId, instanceId},
    },
  ]);
  if (isStudent) {
    const isWithinUploadWindow = await validateCheatsheetUploadWindowOrSetError(
      universityId,
      courseId,
      instanceId,
      weekId,
      res
    );
    if (!isWithinUploadWindow) return;
  }
  if (isStudent && studentId !== userId) {
    return res.status(403).send('You cannot upload a cheat sheet for another student.');
  }
  if (!isInstructor && !isStudent) {
    return res
      .status(403)
      .send('You do not have permission to upload cheat sheets for this course.');
  }
  const config = await getCheatsheetConfigOrSetError(universityId, courseId, instanceId, res);
  const uploadContext = isInstructor && config ? getUploadContext(weekId, config) : undefined;
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
      return res.status(200).json({ message: 'Already uploaded.' });
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
    return res.status(200).json({
      message: 'Updated successfully',
      ...(uploadContext && { uploadContext }),
    });
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
  return res.status(201).json({
    message: 'Uploaded successfully',
    ...(uploadContext && { uploadContext }),
  });
}
