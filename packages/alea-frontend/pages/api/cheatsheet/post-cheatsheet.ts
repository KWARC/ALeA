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
    formidable({ keepExtensions: true, uploadDir: TEMP_CHEATSHEETS_DIR }).parse(
      req,
      (err, _fields, files) => {
        if (err) return reject(err);
        const uploaded = Array.isArray(files.file) ? files.file[0] : files.file;
        if (!uploaded) return reject(new Error('No file uploaded.'));
        resolve(uploaded);
      }
    );
  });
}

async function tryJsQR(buf: Buffer, w: number, h: number): Promise<string | null> {
  const result = jsQR(new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.byteLength), w, h);
  return result ? result.data : null;
}

async function normaliseForDetection(
  rgba: Buffer,
  w: number,
  h: number,
  targetMin = 300,
  targetMax = 1200
): Promise<{ buf: Buffer; w: number; h: number }> {
  const maxDim = Math.max(w, h);
  const minDim = Math.min(w, h);

  if (maxDim <= targetMax && minDim >= targetMin) return { buf: rgba, w, h };

  let newW: number, newH: number;
  if (maxDim > targetMax) {
    const f = targetMax / maxDim;
    newW = Math.round(w * f);
    newH = Math.round(h * f);
  } else {
    const f = targetMin / minDim;
    newW = Math.round(w * f);
    newH = Math.round(h * f);
  }

  const buf = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .resize(newW, newH, { kernel: 'lanczos3' })
    .raw()
    .toBuffer();
  return { buf, w: newW, h: newH };
}

async function scaleVariants(
  rgba: Buffer,
  w: number,
  h: number
): Promise<Array<{ buf: Buffer; w: number; h: number; label: string }>> {
  const variants: Array<{ buf: Buffer; w: number; h: number; label: string }> = [];
  const natural = await normaliseForDetection(rgba, w, h);
  variants.push({ ...natural, label: 'natural' });
  for (const scale of [0.5, 0.75, 1.5, 2, 3]) {
    const nw = Math.round(w * scale);
    const nh = Math.round(h * scale);
    if (nw < 50 || nh < 50 || nw > 4000 || nh > 4000) continue; // sanity bounds
    if (variants.some((v) => Math.abs(v.w - nw) < 10 && Math.abs(v.h - nh) < 10)) continue;
    const buf = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
      .resize(nw, nh, { kernel: 'lanczos3' })
      .raw()
      .toBuffer();
    variants.push({ buf, w: nw, h: nh, label: `x${scale}` });
  }

  return variants;
}

async function cornerCrops(
  rgba: Buffer,
  w: number,
  h: number
): Promise<Array<{ buf: Buffer; w: number; h: number; label: string }>> {
  const crops: Array<{ buf: Buffer; w: number; h: number; label: string }> = [];
  const cw = Math.round(w * 0.35);
  const ch = Math.round(h * 0.35);
  const positions = [
    { left: 0, top: 0, label: 'top-left' },
    { left: w - cw, top: 0, label: 'top-right' },
    { left: 0, top: h - ch, label: 'bottom-left' },
    { left: w - cw, top: h - ch, label: 'bottom-right' },
  ];
  for (const { left, top, label } of positions) {
    const buf = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
      .extract({ left, top, width: cw, height: ch })
      .raw()
      .toBuffer();
    crops.push({ buf, w: cw, h: ch, label });
  }
  return crops;
}

async function toGreyscaleRGBA(rgba: Buffer, w: number, h: number): Promise<Buffer> {
  return sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .greyscale()
    .toColorspace('srgb')
    .ensureAlpha()
    .raw()
    .toBuffer();
}

async function attemptQROnVariants(
  variants: Array<{ buf: Buffer; w: number; h: number; label: string }>,
  context: string
): Promise<string | null> {
  for (const { buf, w, h, label } of variants) {
    let data = await tryJsQR(buf, w, h);
    if (data) {
      console.log(`QR found [${context}/${label}/colour]`);
      return data;
    }
    const grey = await toGreyscaleRGBA(buf, w, h);
    data = await tryJsQR(grey, w, h);
    if (data) {
      console.log(`QR found [${context}/${label}/grey]`);
      return data;
    }
  }
  return null;
}

async function extractQRFromImage(buffer: Buffer): Promise<QRData> {
  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height)
      throw new Error('Could not determine image dimensions');

    const { width, height } = metadata;
    const rgba = await sharp(buffer).toColorspace('srgb').ensureAlpha().raw().toBuffer();

    const variants = await scaleVariants(rgba, width, height);
    let raw = await attemptQROnVariants(variants, 'full');
    if (!raw) {
      const crops = await cornerCrops(rgba, width, height);
      const cropVariants: Array<{ buf: Buffer; w: number; h: number; label: string }> = [];
      for (const crop of crops) {
        const norm = await normaliseForDetection(crop.buf, crop.w, crop.h);
        cropVariants.push({ ...norm, label: crop.label });
        const up2w = Math.round(norm.w * 2);
        const up2h = Math.round(norm.h * 2);
        if (up2w <= 3000 && up2h <= 3000) {
          const up2 = await sharp(norm.buf, { raw: { width: norm.w, height: norm.h, channels: 4 } })
            .resize(up2w, up2h, { kernel: 'lanczos3' })
            .raw()
            .toBuffer();
          cropVariants.push({ buf: up2, w: up2w, h: up2h, label: `${crop.label}x2` });
        }
      }
      raw = await attemptQROnVariants(cropVariants, 'crop');
    }

    if (!raw) throw new Error('No QR code found in image at any scale or crop.');

    const outer = JSON.parse(raw) as { payload: string; signature: string };
    if (!verifyQRSignature(outer.payload, outer.signature)) {
      throw new Error('QR signature verification failed — file may be tampered.');
    }
    const json = JSON.parse(outer.payload) as Record<string, string>;
    return { cheatsheetId: json['cheatsheetId'] ?? undefined };
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

  console.log(
    'extractFields - mimetype:',
    mimetype,
    'pdfMagicBytes:',
    pdfMagicBytes,
    'isPDF:',
    isPDF
  );

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
        const { width, height, data, kind } = img;
        const pixelCount = width * height;

        let greyBuf: Buffer | null = null;

        if (kind === 1) {
          greyBuf = Buffer.alloc(pixelCount);
          const stride = Math.ceil(width / 8);
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const bit = (data[y * stride + (x >> 3)] >> (7 - (x & 7))) & 1;
              greyBuf[y * width + x] = bit ? 0x00 : 0xff;
            }
          }
        }

        let rgba: Buffer;
        if (greyBuf) {
          rgba = await sharp(greyBuf, { raw: { width, height, channels: 1 } })
            .toColorspace('srgb')
            .ensureAlpha()
            .raw()
            .toBuffer();
        } else {
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

          rgba = await sharp(raw, { raw: { width, height, channels: ch as 1 | 2 | 3 | 4 } })
            .toColorspace('srgb')
            .ensureAlpha()
            .raw()
            .toBuffer();
        }

        const variants = await scaleVariants(rgba, width, height);
        let qrRaw = await attemptQROnVariants(variants, `pdf-p${pageNum}-${name}-full`);

        if (!qrRaw) {
          const crops = await cornerCrops(rgba, width, height);
          const cropVariants: Array<{ buf: Buffer; w: number; h: number; label: string }> = [];
          for (const crop of crops) {
            const norm = await normaliseForDetection(crop.buf, crop.w, crop.h);
            cropVariants.push({ ...norm, label: crop.label });
            const up2w = Math.round(norm.w * 2);
            const up2h = Math.round(norm.h * 2);
            if (up2w <= 3000 && up2h <= 3000) {
              const up2 = await sharp(norm.buf, {
                raw: { width: norm.w, height: norm.h, channels: 4 },
              })
                .resize(up2w, up2h, { kernel: 'lanczos3' })
                .raw()
                .toBuffer();
              cropVariants.push({ buf: up2, w: up2w, h: up2h, label: `${crop.label}x2` });
            }
          }
          qrRaw = await attemptQROnVariants(cropVariants, `pdf-p${pageNum}-${name}-crop`);
        }

        if (qrRaw) {
          const outer = JSON.parse(qrRaw) as { payload: string; signature: string };
          if (!verifyQRSignature(outer.payload, outer.signature)) {
            throw new Error('QR signature verification failed — file may be tampered.');
          }
          const json = JSON.parse(outer.payload) as Record<string, string>;
          return { cheatsheetId: json['cheatsheetId'] ?? undefined };
        }

        console.warn(`No QR detected in image "${name}" on page ${pageNum} at any scale.`);
      } catch (err) {
        console.warn(`Failed to decode QR from image "${name}" on page ${pageNum}:`, err);
      }
    }
  }

  throw new Error(`No QR code found across first ${Math.min(pdf.numPages, 3)} page(s).`);
}

function buildCheatsheetUploadErrorMessage(uploadContext: UploadContext, weekId: string) {
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
    const errorMessage = buildCheatsheetUploadErrorMessage(uploadContext, weekId);
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
      variables: { courseId, instanceId },
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
