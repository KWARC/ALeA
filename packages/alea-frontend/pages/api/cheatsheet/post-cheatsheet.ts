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
import {
  isUserIdAuthorizedForAny,
} from '../access-control/resource-utils';
import { Action, ResourceName } from '@alea/utils';
import { getCheatSheetConfigOrSet500OnError } from './create-cheatsheet';

pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.js');
const CHEATSHEETS_DIR = process.env.CHEATSHEETS_DIR;

export const config = { api: { bodyParser: false } };

interface QRData {
  courseId: string;
  dateOfDownload: string;
  instanceId: string;
  universityId: string;
  studentId: string;
  studentName?: string;
  weekId: string;
}

interface ExtractedFields {
  studentName?: string;
  studentId?: string;
  weekId?: string;
  instanceId?: string;
  courseId?: string;
  universityId?: string;
  dateOfDownload?: string;
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
  buffer: Buffer,
  fileType: 'pdf' | 'image'
): Promise<{ fields: ExtractedFields; diagnostics: string }> {
  const qr = fileType === 'image'
    ? await extractQRFromImage(buffer)
    : await extractQRFromPDF(buffer);

  const fields: ExtractedFields = {
    courseId: qr.courseId,
    instanceId: qr.instanceId,
    universityId: qr.universityId,
    studentName: qr.studentName,
    studentId: qr.studentId,
    weekId: qr.weekId,
    dateOfDownload: qr.dateOfDownload,
  };

  return { fields, diagnostics: 'QR: ok' };
}

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/tiff',
  'image/heic',
  'image/heif',
]);
const IMAGE_MAGIC: { bytes: number[]; mime: string }[] = [
  { bytes: [0xff, 0xd8, 0xff], mime: 'image/jpeg' },
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: 'image/png' },
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp' }, // RIFF....WEBP
];

function detectFileType(buffer: Buffer, mimeType?: string): 'pdf' | 'image' | 'unknown' {
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46)
    return 'pdf';
  for (const sig of IMAGE_MAGIC) {
    if (sig.bytes.every((b, i) => buffer[i] === b)) return 'image';
  }
  if (mimeType) {
    if (mimeType === 'application/pdf') return 'pdf';
    if (IMAGE_MIME_TYPES.has(mimeType)) return 'image';
  }
  return 'unknown';
}

async function extractQRFromImage(buffer: Buffer): Promise<QRData> {
  for (const scale of [1, 2, 4]) {
    let imgBuffer: Buffer;
    let metadata: { width: number; height: number };

    if (scale === 1) {
      const img = sharp(buffer).toColorspace('srgb').ensureAlpha();
      const meta = await img.metadata();
      imgBuffer = await img.raw().toBuffer();
      metadata = { width: meta.width!, height: meta.height! };
    } else {
      const baseMeta = await sharp(buffer).metadata();
      const w = baseMeta.width! * scale;
      const h = baseMeta.height! * scale;
      imgBuffer = await sharp(buffer)
        .resize(w, h, { kernel: 'nearest' })
        .toColorspace('srgb')
        .ensureAlpha()
        .raw()
        .toBuffer();
      metadata = { width: w, height: h };
    }

    const result = jsQR(
      new Uint8ClampedArray(imgBuffer.buffer, imgBuffer.byteOffset, imgBuffer.byteLength),
      metadata.width,
      metadata.height
    );

    if (result) {
      console.log(`QR found in image at scale ${scale}`);
      const outer = JSON.parse(result.data) as { payload: string; signature: string };
      if (!verifyQRSignature(outer.payload, outer.signature)) {
        throw new Error('QR signature verification failed — file may be tampered.');
      }
      const json = JSON.parse(outer.payload) as Record<string, string>;
      return {
        courseId: json['courseId'] ?? undefined,
        dateOfDownload: json['dateOfDownload'] ?? json['downloadDate'] ?? undefined,
        instanceId: json['instanceId'] ?? undefined,
        universityId: json['universityId'] ?? undefined,
        studentId: json['studentId'] ?? undefined,
        studentName: json['studentName'] ?? undefined,
        weekId: json['weekId'] ?? json['quizId'] ?? undefined,
      };
    }
  }
  throw new Error('No QR code found in image.');
}

async function convertImageToPDF(imageBuffer: Buffer): Promise<Buffer> {
  const { width, height } = await sharp(imageBuffer).metadata();
  const jpegBuffer = await sharp(imageBuffer).jpeg({ quality: 92 }).toBuffer();

  const w = width!;
  const h = height!;
  const imgLen = jpegBuffer.length;
  const xobj = Buffer.from(
    `1 0 obj\n<</Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgLen}>>\nstream\n`
  );
  const xobjEnd = Buffer.from('\nendstream\nendobj\n');

  const page = `2 0 obj\n<</Type /Page /Parent 3 0 R /MediaBox [0 0 ${w} ${h}] /Contents 4 0 R /Resources <</XObject <</Im1 1 0 R>>>>>>\nendobj\n`;
  const pages = `3 0 obj\n<</Type /Pages /Kids [2 0 R] /Count 1>>\nendobj\n`;
  const content = `q ${w} 0 0 ${h} 0 0 cm /Im1 Do Q`;
  const contentStream = `4 0 obj\n<</Length ${content.length}>>\nstream\n${content}\nendstream\nendobj\n`;
  const catalog = `5 0 obj\n<</Type /Catalog /Pages 3 0 R>>\nendobj\n`;

  const header = Buffer.from('%PDF-1.4\n');
  const obj1Start = header.length;
  const obj1 = Buffer.concat([xobj, jpegBuffer, xobjEnd]);
  const obj2Start = obj1Start + obj1.length;
  const obj2 = Buffer.from(page);
  const obj3Start = obj2Start + obj2.length;
  const obj3 = Buffer.from(pages);
  const obj4Start = obj3Start + obj3.length;
  const obj4 = Buffer.from(contentStream);
  const obj5Start = obj4Start + obj4.length;
  const obj5 = Buffer.from(catalog);
  const xrefStart = obj5Start + obj5.length;

  const xref = Buffer.from(
    `xref\n0 6\n0000000000 65535 f \n${String(obj1Start).padStart(10, '0')} 00000 n \n${String(
      obj2Start
    ).padStart(10, '0')} 00000 n \n${String(obj3Start).padStart(10, '0')} 00000 n \n${String(
      obj4Start
    ).padStart(10, '0')} 00000 n \n${String(obj5Start).padStart(
      10,
      '0'
    )} 00000 n \ntrailer\n<</Size 6 /Root 5 0 R>>\nstartxref\n${xrefStart}\n%%EOF\n`
  );

  return Buffer.concat([header, obj1, obj2, obj3, obj4, obj5, xref]);
}

function savePDF(filepath: string, cheatsheetDir: string, fileName: string): boolean {
  const dest = path.join(cheatsheetDir, fileName);
  const prefix = fileName.replace(/_&[^.]+\.pdf$/, ''); //Remove a trailing _&<text>.pdf suffix from the filename.
  const existing = fs.readdirSync(cheatsheetDir).find((f) => f.startsWith(prefix));
  console.log({ existing });
  if (existing) fs.unlinkSync(path.join(cheatsheetDir, existing));
  fs.renameSync(filepath, dest);
  return !!existing;
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

    console.log(`Page ${pageNum}: found ${imgNames.length} image(s):`, imgNames);

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
            console.log(`QR found on page ${pageNum}, image "${name}", scale ${scale}`);
            const outer = JSON.parse(result.data) as { payload: string; signature: string };
            if (!verifyQRSignature(outer.payload, outer.signature)) {
              throw new Error('QR signature verification failed — file may be tampered.');
            }
            const json = JSON.parse(outer.payload) as Record<string, string>;
            return {
              courseId: json['courseId'] ?? undefined,
              dateOfDownload: json['dateOfDownload'] ?? json['downloadDate'] ?? undefined,
              instanceId: json['instanceId'] ?? undefined,
              universityId: json['universityId'] ?? undefined,
              studentId: json['studentId'] ?? undefined,
              studentName: json['studentName'] ?? undefined,
              weekId: json['weekId'] ?? json['quizId'] ?? undefined,
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
  console.log({ userId });
  if (!CHEATSHEETS_DIR) return res.status(500).send('CHEATSHEETS_DIR is not configured.');
  fs.mkdirSync(CHEATSHEETS_DIR, { recursive: true });
  console.log('he');
  let file: formidable.File;
  try {
    file = await parseUpload(req);
    console.log({ file });
  } catch (err: unknown) {
    return res.status(400).send((err as Error)?.message ?? 'Failed to parse form.');
  }
  const buffer = fs.readFileSync(file.filepath);

  const fileType = detectFileType(buffer, file.mimetype ?? undefined);
  if (fileType === 'unknown') {
    return res
      .status(400)
      .send('Unsupported file type. Only PDF and image files (JPEG, PNG, WebP) are accepted.');
  }
  console.log({ fileType });

  let fields: ExtractedFields, diagnostics: string;
  try {
    ({ fields, diagnostics } = await extractFields(buffer, fileType));
  } catch (err) {
    console.error('Error extracting fields:', err);
    return res.status(500).send('Failed to extract fields.');
  }
  console.log({ fields, diagnostics });
  const missing = (
    ['courseId', 'instanceId', 'universityId', 'weekId', 'studentId', 'dateOfDownload'] as const
  ).filter((k) => !fields[k]);

  if (missing.length > 0) {
    return res
      .status(400)
      .send(`Could not extract required fields (${missing.join(', ')}). ${diagnostics}`);
  }
  const { courseId, instanceId, universityId, weekId, studentId } = fields;
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
  console.log({ checksum });
  const fileName = buildFileName(fields, userId, checksum);
  console.log({ fileName });

  // For image uploads: convert to PDF and write the converted PDF to the temp filepath
  // so savePDF can rename it into place as a .pdf file
  if (fileType === 'image') {
    const pdfBuffer = await convertImageToPDF(buffer);
    fs.writeFileSync(file.filepath, pdfBuffer);
  }

  try {
    const isReplacement = savePDF(file.filepath, CHEATSHEETS_DIR, fileName);
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
  console.log({ existing });
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
    //multiple uploads when upload window is open 
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
  const ownerId = isInstructor ? fields.studentId : userId;
  const inserted = await executeAndEndSet500OnError(
    `INSERT INTO CheatSheet
       (userId, studentName, weekId, instanceId, courseId, universityId, checksum, fileName, dateOfDownload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ownerId,
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