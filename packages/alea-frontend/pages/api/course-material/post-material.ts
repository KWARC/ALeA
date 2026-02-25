import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeDontEndSet500OnError,
} from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, ResourceName } from '@alea/utils';

const BASE_PATH = process.env.MATERIALS_DIR || path.join(process.cwd(), 'materials');
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.json': 'application/json',
    '.md': 'text/markdown',
    '.txt': 'text/plain',
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

async function handleFileMaterial(
  req: NextApiRequest,
  res: NextApiResponse,
  materialId: string,
  userId: string,
  { universityId, courseId, instanceId, materialName, fileBase64, fileName, expectedSize }: any
) {
  if (!fileBase64 || !fileName) {
    return res.status(422).send('Missing file data');
  }

  const fileBuffer = Buffer.from(fileBase64, 'base64');

  if (expectedSize !== undefined && fileBuffer.length !== expectedSize) {
    return res
      .status(400)
      .send(
        `Partial upload detected: expected ${expectedSize} bytes, received ${fileBuffer.length} bytes`
      );
  }

  const ext = path.extname(fileName).toLowerCase();
  const mimeType = getMimeType(fileName);
  const tempFileName = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
  const tempFilePath = path.join(BASE_PATH, tempFileName);

  if (!fs.existsSync(BASE_PATH)) {
    fs.mkdirSync(BASE_PATH, { recursive: true });
  }

  try {
    fs.writeFileSync(tempFilePath, fileBuffer);
    const checksum = await computeChecksumStreaming(tempFilePath);
    const duplicateCheck = (await executeDontEndSet500OnError(
      `SELECT id FROM CourseMaterials WHERE checksum = ?`,
      [checksum],
      res
    )) as any[];
    if (!duplicateCheck) {
      fs.unlinkSync(tempFilePath);
      return;
    }
    if (duplicateCheck.length > 0) {
      fs.unlinkSync(tempFilePath);
      return res.status(409).send('Duplicate file already exists');
    }
    const storageFileName = `${checksum}${ext}`;
    const filePath = path.join(BASE_PATH, storageFileName);
    try {
      fs.renameSync(tempFilePath, filePath);
    } catch (renameError) {
      fs.unlinkSync(tempFilePath);
      console.error('File rename error:', renameError);
      return res.status(500).send(`File rename error: ${renameError.message}`);
    }
    const dbResult = await executeAndEndSet500OnError(
      `INSERT INTO CourseMaterials 
       (id, materialName, materialType, storageFileName, mimeType, sizeBytes,
        universityId, courseId, semesterId, uploadedBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

      [
        materialId,
        materialName,
        'FILE',
        storageFileName,
        mimeType,
        fileBuffer.length,
        universityId,
        courseId,
        instanceId,
        userId,
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
     (id, materialName, materialType, universityId, courseId, semesterId, uploadedBy, url)
     VALUES (?, ?, 'LINK', ?, ?, ?, ?, ?)`,
    [materialId, materialName, universityId, courseId, instanceId, userId, url],
    res
  );

  if (!dbResult) return;

  return res.status(200).end();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const {
    universityId,
    courseId,
    instanceId,
    type,
    materialName,
    url,
    fileBase64,
    fileName,
    expectedSize,
  } = req.body;

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
    return handleFileMaterial(req, res, materialId, userId, {
      universityId,
      courseId,
      instanceId,
      materialName,
      fileBase64,
      fileName,
      expectedSize,
    });
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
