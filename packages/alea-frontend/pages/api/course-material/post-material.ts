import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import formidable from 'formidable';
import os from 'os';

import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeDontEndSet500OnError,
} from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, ResourceName } from '@alea/utils';

const BASE_PATH = path.resolve(process.env.MATERIALS_DIR || path.join(process.cwd(), 'materials'));
const MAX_FILE_SIZE = Number(process.env.MAX_MATERIAL_FILE_SIZE) || 2 * 1024 * 1024 * 1024; //2GB default

export const config = {
  api: {
    bodyParser: false,
  },
};

export function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.json': 'application/json',
    '.md': 'text/markdown',
    '.txt': 'text/plain',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

async function computeChecksumStreaming(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = fs.createReadStream(filePath);
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex').substring(0, 8)));
    stream.on('error', reject);
  });
}

function parseForm(
  req: NextApiRequest
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const form = formidable({
    maxFileSize: MAX_FILE_SIZE,
    maxTotalFileSize: MAX_FILE_SIZE,
    uploadDir: os.tmpdir(),
    keepExtensions: true,
    multiples: false,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Form parse error:', err);
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
}

function getField(fields: formidable.Fields, key: string): string | undefined {
  const val = fields[key];
  if (Array.isArray(val)) return val[0];
  return val as string | undefined;
}

async function handleFileMaterial(
  res: NextApiResponse,
  materialId: string,
  userId: string,
  universityId: string,
  courseId: string,
  instanceId: string,
  materialName: string,
  file: formidable.File
) {
  const tempFilePath = file.filepath;
  const originalFileName = file.originalFilename || 'unknown';
  const ext = path.extname(originalFileName).toLowerCase();
  const mimeType = getMimeType(originalFileName);
  const fileSize = file.size;

  if (!fs.existsSync(BASE_PATH)) {
    fs.mkdirSync(BASE_PATH, { recursive: true });
  }

  try {
    const checksum = await computeChecksumStreaming(tempFilePath);
    const duplicateCheck = (await executeDontEndSet500OnError(
      `SELECT id FROM CourseMaterials WHERE checksum = ?`,
      [checksum],
      res
    )) as any[];
    if (!duplicateCheck) {
      return;
    }
    if (duplicateCheck.length > 0) {
      return res.status(409).send('Duplicate file already exists');
    }
    const storageFileName = `${checksum}${ext}`;
    const filePath = path.resolve(BASE_PATH, storageFileName);
    try {
      fs.renameSync(tempFilePath, filePath);
    } catch (renameError) {
      try {
        fs.copyFileSync(tempFilePath, filePath);
        fs.unlinkSync(tempFilePath);
      } catch (copyError) {
        console.error('File move error:', copyError);
        return res.status(500).send(`File move error: ${copyError.message}`);
      }
    }
    const dbResult = await executeAndEndSet500OnError(
      `INSERT INTO CourseMaterials 
       (id, materialName, materialType, storageFileName, mimeType, sizeBytes,
        universityId, courseId, instanceId, uploadedBy, checksum)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        materialId,
        materialName,
        'FILE',
        storageFileName,
        mimeType,
        fileSize,
        universityId,
        courseId,
        instanceId,
        userId,
        checksum,
      ],
      res
    );

    if (!dbResult && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return;
    }

    return res.status(200).end();
  } catch (error) {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    console.error('File processing error:', error);
    return res.status(500).send(`File processing error: ${error.message || error}`);
  }
}

async function handleLinkMaterial(
  res: NextApiResponse,
  materialId: string,
  userId: string,
  { universityId, courseId, instanceId, materialName, url }: any
) {
  if (!url) {
    return res.status(422).send('Missing url for Link type');
  }

  try {
    new URL(url);
  } catch {
    return res.status(400).send('Invalid URL format');
  }

  const dbResult = await executeAndEndSet500OnError(
    `INSERT INTO CourseMaterials 
     (id, materialName, materialType, universityId, courseId, instanceId, uploadedBy, url)
     VALUES (?, ?, 'LINK', ?, ?, ?, ?, ?)`,
    [materialId, materialName, universityId, courseId, instanceId, userId, url],
    res
  );

  if (!dbResult) return;

  return res.status(200).end();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  let fields: formidable.Fields;
  let files: formidable.Files;

  try {
    const parsed = await parseForm(req);
    fields = parsed.fields;
    files = parsed.files;
  } catch (err) {
    console.error('Form parse error:', err);
    return res.status(400).send(`Failed to parse form data: ${err.message}`);
  }

  const universityId = getField(fields, 'universityId');
  const courseId = getField(fields, 'courseId');
  const instanceId = getField(fields, 'instanceId');
  const type = getField(fields, 'type');
  const materialName = getField(fields, 'materialName');
  const url = getField(fields, 'url');

  if (!universityId || !courseId || !instanceId || !type || !materialName) {
    return res.status(422).send('Missing required fields');
  }

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_METADATA,
    Action.MUTATE,
    { universityId, courseId, instanceId }
  );

  if (!userId) return;

  const materialId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  if (type === 'FILE') {
    const fileData = files.file;
    if (!fileData) {
      return res.status(422).send('Missing file upload');
    }

    // Handle both single file and array of files
    const file = Array.isArray(fileData) ? fileData[0] : fileData;
    if (!file) {
      return res.status(422).send('Missing file upload');
    }

    return handleFileMaterial(
      res,
      materialId,
      userId,
      universityId,
      courseId,
      instanceId,
      materialName,
      file
    );
  } else if (type === 'LINK') {
    return handleLinkMaterial(res, materialId, userId, {
      universityId,
      courseId,
      instanceId,
      materialName,
      url,
    });
  } else {
    return res.status(422).send('Invalid type. Must be FILE or LINK');
  }
}
