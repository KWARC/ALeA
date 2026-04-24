import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeTxnAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { isUserIdAuthorizedForAny } from '../access-control/resource-utils';
import { Action, ResourceName } from '@alea/utils';
import {
  getCheatsheetConfigOrSetError,
  getUploadContext,
  validateCheatsheetUploadWindowOrSetError,
} from './post-cheatsheet';

function validateBody(body: any): body is { cheatsheetId: string } {
  return typeof body?.cheatsheetId === 'string' && body.cheatsheetId.trim().length > 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  if (!validateBody(req.body)) {
    return res.status(422).send('Missing or invalid cheatsheetId.');
  }

  const { cheatsheetId } = req.body;

  // ── 1. Fetch the CheatSheet record ───────────────────────────────────────
  const cheatSheetData = await executeAndEndSet500OnError(
    `SELECT * FROM CheatSheet WHERE cheatsheetId = ?`,
    [cheatsheetId],
    res
  );
  if (!cheatSheetData) return;
  if (!cheatSheetData.length) {
    return res.status(404).send('Cheatsheet record not found.');
  }

  const existingRow = cheatSheetData[0];
  const { userId: studentId, courseId, instanceId, universityId, weekId, fileName } = existingRow;

  // ── 2. Authorisation — mirrors post-cheatsheet.ts exactly ────────────────
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

  if (!isInstructor && !isStudent) {
    return res
      .status(403)
      .send('You do not have permission to delete cheat sheets for this course.');
  }

  // Students must be within the upload window to delete
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

  // Students can only delete their own cheatsheet
  if (isStudent && studentId !== userId) {
    return res.status(403).send('You cannot delete a cheat sheet for another student.');
  }

  // ── 3. Guard: nothing uploaded yet ───────────────────────────────────────
  if (!existingRow.uploadedAt || !fileName) {
    return res.status(400).send('No uploaded file found for this cheatsheet to delete.');
  }

  // ── 4. Archive to history then clear upload fields ──────────────────────
  // History must be written here so a subsequent re-upload is treated as
  // a fresh first upload (uploadedAt = NULL) while the deleted version is
  // still preserved in CheatSheetHistory.
  const result = await executeTxnAndEndSet500OnError(
    res,
    // Step A — archive current row into history
    `INSERT INTO CheatSheetHistory
       (cheatsheetId, uploadedVersionNumber, uploadedByUserId, checksum, fileName, uploadedAt, createdAt)
     SELECT cheatsheetId, uploadedVersionNumber, uploadedByUserId, checksum, fileName, uploadedAt, createdAt
     FROM CheatSheet
     WHERE cheatsheetId = ?`,
    [cheatsheetId],
    // Step B — clear upload fields on the live record
    `UPDATE CheatSheet
     SET checksum            = NULL,
         fileName            = NULL,
         uploadedVersionNumber = uploadedVersionNumber + 1,
         uploadedByUserId    = NULL,
         uploadedAt          = NULL
     WHERE cheatsheetId = ?`,
    [cheatsheetId]
  );
  if (!result) return;

  // ── 5. Build optional upload-context for the response ───────────────────
  const config = isInstructor
    ? await getCheatsheetConfigOrSetError(universityId, courseId, instanceId, res)
    : undefined;
  const uploadContext = isInstructor && config ? getUploadContext(weekId, config) : undefined;

  return res.status(200).json({
    message: 'Cheatsheet deleted successfully.',
    ...(uploadContext && { uploadContext }),
  });
}
