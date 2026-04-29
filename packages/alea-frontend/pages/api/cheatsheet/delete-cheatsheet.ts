import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, getUserIdOrSetError } from '../comment-utils';
import { isUserIdAuthorizedForAny } from '../access-control/resource-utils';
import { Action, ResourceName } from '@alea/utils';
import { commentsDb } from '../prisma-comments';
import fs from 'fs';
import path from 'path';

const CHEATSHEETS_DIR = process.env.CHEATSHEETS_DIR;

function validateBody(body: unknown): body is { cheatsheetId: string } {
  if (!body || typeof body !== 'object') return false;

  const { cheatsheetId } = body as { cheatsheetId?: unknown };
  return typeof cheatsheetId === 'string' && cheatsheetId.trim().length > 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  if (!validateBody(req.body)) {
    return res.status(422).send('Missing or invalid cheatsheetId.');
  }

  const { cheatsheetId } = req.body;
  let existingRow;
  try {
    existingRow = await commentsDb.cheatSheet.findUnique({
      where: { cheatsheetId },
      select: {
        userId: true,
        courseId: true,
        instanceId: true,
        checksum: true,
        fileName: true,
        uploadedVersionNumber: true,
        uploadedByUserId: true,
        uploadedAt: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal Server Error.');
  }

  if (!existingRow) return res.status(404).send('Cheatsheet record not found.');

  const {
    userId: studentId,
    courseId,
    instanceId,
    checksum,
    fileName,
    uploadedVersionNumber,
    uploadedByUserId,
    uploadedAt,
    createdAt,
  } = existingRow;

  const isInstructor = await isUserIdAuthorizedForAny(userId, [
    {
      name: ResourceName.COURSE_CHEATSHEET,
      action: Action.MUTATE,
      variables: { courseId, instanceId },
    },
  ]);

  if (!isInstructor && studentId !== userId) {
    return res
      .status(403)
      .send('You can only delete your own cheat sheet unless you are an instructor.');
  }

  if (!CHEATSHEETS_DIR) return res.status(500).send('CHEATSHEETS_DIR is not configured.');

  if (!uploadedAt || !fileName || uploadedVersionNumber === null || !uploadedByUserId) {
    return res.status(400).send('No uploaded file found for this cheatsheet to delete.');
  }

  const filePrefix = fileName ? fileName.replace(/-[a-f0-9]{8}\.pdf$/i, '') : '';

  try {
    const fileNames = fs.readdirSync(CHEATSHEETS_DIR);
    const matchingFiles = filePrefix
      ? fileNames.filter((name) => name.startsWith(filePrefix) && name.endsWith('.pdf'))
      : [];

    for (const matchingFileName of matchingFiles) {
      fs.unlinkSync(path.join(CHEATSHEETS_DIR, matchingFileName));
    }

    await commentsDb.$transaction(async (tx) => {
      await tx.cheatSheetHistory.create({
        data: {
          cheatsheetId,
          uploadedVersionNumber,
          uploadedByUserId,
          checksum,
          fileName,
          uploadedAt,
          createdAt,
        },
      });

      await tx.cheatSheet.update({
        where: { cheatsheetId },
        data: {
          checksum: null,
          fileName: null,
          uploadedByUserId: null,
          uploadedAt: null,
        },
      });
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal Server Error.');
  }

  return res.status(204).end();
}
