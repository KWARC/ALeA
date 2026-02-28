import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeDontEndSet500OnError,
} from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, ResourceName } from '@alea/utils';
import { sendAlert } from '../add-comment';
const BASE_PATH = process.env.MATERIALS_DIR || path.join(process.cwd(), 'materials');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { id } = req.body;

  if (!id) {
    return res.status(422).send('Missing required field: id');
  }
  const materials = (await executeDontEndSet500OnError(
    `SELECT courseId,  instanceId, materialType, storageFileName FROM CourseMaterials WHERE id = ?`,
    [id],
    res
  )) as any[];

  if (!materials) return;
  if (materials.length === 0) return res.status(404).send('Material not found');

  const { courseId, instanceId, materialType, storageFileName } = materials[0];

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_METADATA,
    Action.MUTATE,
    { courseId, instanceId }
  );

  if (!userId) return;
  const dbResult = await executeAndEndSet500OnError(
    `DELETE FROM CourseMaterials WHERE id = ?`,
    [id],
    res
  );

  if (!dbResult) return;
  if (materialType === 'FILE' && storageFileName) {
    const filePath = path.resolve(BASE_PATH, String(storageFileName).trim());
    if (!filePath.startsWith(BASE_PATH)) {
      console.error('Invalid filePath');
      return res.status(500).send('Internal server error');
    }
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (deleteError) {
      console.error('Error deleting file from storage:', deleteError);
      await sendAlert(`File deletion failed in disc  ${filePath}`);
      return res.status(500).send('Failed to delete file from storage. DB record preserved.');
    }
  }

  return res.status(200).end();
}
