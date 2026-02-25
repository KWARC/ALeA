import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from './comment-utils';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { PdfReader, Item } from 'pdfreader';

export const config = {
  api: { bodyParser: false },
};

function extractField(text: string, label: string): string | null {
  const match = text.match(new RegExp(`${label}:\\s*(.+)`));
  return match ? match[1].trim() : null;
}

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const cheatsheetDir = process.env.CHEATSHEETS_DIR;
  if (!cheatsheetDir) {
    return res.status(500).send('CHEATSHEET_DIR is not configured.');
  }

  fs.mkdirSync(cheatsheetDir, { recursive: true });
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
  let pdfText: string;
  try {
    const buffer = fs.readFileSync(file.filepath);
    pdfText = await extractTextFromPDF(buffer);
  } catch (err: any) {
    return res.status(400).send('Failed to read PDF: ' + (err?.message ?? 'Unknown error'));
  }

  const courseId = extractField(pdfText, 'Course Id');
  const instanceId = extractField(pdfText, 'Instance Id');
  const universityId = extractField(pdfText, 'University Id');
  const studentName = extractField(pdfText, 'Student Name');
  const weekId = extractField(pdfText, 'Quiz Id');
  const dateOfDownload = extractField(pdfText, 'Downloaded At');

  if (!courseId || !instanceId || !universityId || !weekId) {
    return res
      .status(400)
      .send(
        'Could not extract required fields from PDF. Make sure the PDF contains Course Id, Instance Id, University Id, and Quiz Id.'
      );
  }
  const id = uuidv4();
  const filePath = path.join(cheatsheetDir, `${id}.pdf`);

  try {
    fs.renameSync(file.filepath, filePath);
  } catch (err: any) {
    return res.status(500).send(err?.message ?? 'Failed to save PDF file.');
  }

  const result = await executeAndEndSet500OnError(
    `INSERT INTO CheatSheets (id, userId, studentName, weekId, instanceId, courseId, universityId, dateOfDownload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      studentName ?? null,
      weekId,
      instanceId,
      courseId,
      universityId,
      dateOfDownload ?? null,
    ],
    res
  );
  if (!result) return;
  res.status(204).end();
}
