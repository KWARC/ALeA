import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'node:fs';
import path from 'node:path';
import {
  getPrintPackDir,
  isPathInside,
  PRINT_PACK_COMBINED_FILE,
  PRINT_PACK_ROSTER_FILE,
  PRINT_PACK_STUDENTS_DIR,
  safeStudentPdfName,
} from '@alea/node-utils';
import { Action, ResourceName } from '@alea/utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfGetOrSetError } from '../comment-utils';

function resolveRequestedFile(packDir: string, file: string, studentUserId?: string): string | null {
  if (file === PRINT_PACK_COMBINED_FILE || file === 'combined') {
    return path.join(packDir, PRINT_PACK_COMBINED_FILE);
  }
  if (file === PRINT_PACK_ROSTER_FILE || file === 'roster') {
    return path.join(packDir, PRINT_PACK_ROSTER_FILE);
  }
  if (file === 'student' && studentUserId) {
    return path.join(packDir, PRINT_PACK_STUDENTS_DIR, safeStudentPdfName(studentUserId));
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const { universityId, courseId, instanceId, file, userId: studentUserId } = req.query;
  if (
    typeof universityId !== 'string' ||
    typeof courseId !== 'string' ||
    typeof instanceId !== 'string' ||
    typeof file !== 'string' ||
    !universityId ||
    !courseId ||
    !instanceId ||
    !file
  ) {
    return res.status(422).send('Missing or invalid parameters');
  }
  const instructorId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_CHEATSHEET,
    Action.MUTATE,
    { courseId, instanceId }
  );
  if (!instructorId) return;

  const cheatsheetsDir = process.env.CHEATSHEETS_DIR;
  if (!cheatsheetsDir) return res.status(500).send('CHEATSHEETS_DIR is not configured.');

  const packDir = getPrintPackDir(cheatsheetsDir, universityId, courseId, instanceId);
  const filePath = resolveRequestedFile(
    packDir,
    file,
    typeof studentUserId === 'string' ? studentUserId : undefined
  );
  if (!filePath || !isPathInside(packDir, filePath)) {
    return res.status(400).send('Invalid file');
  }
  if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

  const stat = fs.statSync(filePath);
  const downloadName = path.basename(filePath);
  const stream = fs.createReadStream(filePath);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  stream.on('error', (err) => {
    console.error('Print pack stream error:', err);
    if (!res.headersSent) res.status(500).end('Failed to read file');
    else res.destroy();
  });
  req.on('close', () => stream.destroy());
  stream.pipe(res);
}
