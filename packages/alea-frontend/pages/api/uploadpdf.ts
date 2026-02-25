import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { checkIfPostOrSetError, executeAndEndSet500OnError, getUserIdOrSetError } from './comment-utils';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PdfReader, Item } from 'pdfreader';

// Disable Next.js default body parser so formidable can handle multipart
export const config = {
  api: { bodyParser: false },
};

// Extracts a field value from PDF text using a label like "Course Id: CS201"
function extractField(text: string, label: string): string | null {
  const match = text.match(new RegExp(`${label}:\\s*(.+)`));
  return match ? match[1].trim() : null;
}

// Extract text from PDF buffer using pdfreader
function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const lines: string[] = [];
    new PdfReader().parseBuffer(buffer, (err, item: Item | null) => {
      if (err) return reject(err);
      if (!item) return resolve(lines.join('\n'));
      if ((item as any).text) lines.push((item as any).text);
    });
  });
}

// Generate checksum from file buffer (first 8 hex chars of SHA256)
function generateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8);
}

// Sanitize a value for use in filename (lowercase, replace spaces/special chars with -)
function sanitize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const cheatsheetDir = process.env.CHEATSHEETS_DIR;
  if (!cheatsheetDir) {
    return res.status(500).send('CHEATSHEETS_DIR is not configured.');
  }

  fs.mkdirSync(cheatsheetDir, { recursive: true });

  // Parse multipart form
  const form = formidable({ keepExtensions: true });

  const parsed = await new Promise<{ file: formidable.File } | null>((resolve) => {
    form.parse(req, (err, _fields, files) => {
      if (err) {
        res.status(400).send(err?.message ?? 'Failed to parse form.');
        return resolve(null);
      }
      const uploaded = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!uploaded) {
        res.status(400).send('No file uploaded.');
        return resolve(null);
      }
      resolve({ file: uploaded });
    });
  });

  if (!parsed) return;
  const { file } = parsed;

  // Read buffer once — used for both text extraction and checksum
  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(file.filepath);
  } catch (err: any) {
    return res.status(500).send('Failed to read uploaded file: ' + (err?.message ?? 'Unknown error'));
  }

  // Extract text from PDF and parse metadata
  let pdfText: string;
  try {
    pdfText = await extractTextFromPDF(buffer);
  } catch (err: any) {
    return res.status(400).send('Failed to parse PDF: ' + (err?.message ?? 'Unknown error'));
  }

  const courseId      = extractField(pdfText, 'Course Id');
  const instanceId    = extractField(pdfText, 'Instance Id');
  const universityId  = extractField(pdfText, 'University Id');
  const studentName   = extractField(pdfText, 'Student Name');
  const weekId        = extractField(pdfText, 'Quiz Id');
  const dateOfDownload = extractField(pdfText, 'Downloaded At');

  if (!courseId || !instanceId || !universityId || !weekId) {
    return res.status(400).send(
      'Could not extract required fields from PDF. Make sure it contains Course Id, Instance Id, University Id, and Quiz Id.'
    );
  }

  // Generate checksum from file content
  const checksum = generateChecksum(buffer);

  // Build filename: {universityId}_{courseId}_{instanceId}_{userId}_{weekId}_&{checksum}.pdf
  // e.g. fau_ai-1_WS24-26_fake_joy_week1_&5617889.pdf
  const fileName = `${sanitize(universityId)}_${sanitize(courseId)}_${sanitize(instanceId)}_${sanitize(userId)}_${sanitize(weekId)}_&${checksum}.pdf`;
  const filePath = path.join(cheatsheetDir, fileName);

  // Save file to disk
  try {
    fs.renameSync(file.filepath, filePath);
  } catch (err: any) {
    return res.status(500).send(err?.message ?? 'Failed to save PDF file.');
  }

  const id = uuidv4();

  const result = await executeAndEndSet500OnError(
    `INSERT INTO CheatSheets (id, userId, studentName, weekId, instanceId, courseId, universityId, dateOfDownload, checksum)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, studentName ?? null, weekId, instanceId, courseId, universityId, dateOfDownload ?? null, checksum],
    res
  );
  if (!result) return;
  res.status(204).end();
}