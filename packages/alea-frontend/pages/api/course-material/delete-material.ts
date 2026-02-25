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

const BASE_PATH = process.env.MATERIALS_DIR || path.join(process.cwd(), 'materials');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { id } = req.body;

  if (!id) {
    return res.status(422).send('Missing required field: id');
  }

  const materials = (await executeDontEndSet500OnError(
    `SELECT courseId, semesterId, materialType, storageFileName FROM CourseMaterials WHERE id = ?`,
    [id],
    res
  )) as any[];

  if (!materials || materials.length === 0) {
    return res.status(404).send('Material not found');
  }

  const { courseId, semesterId: instanceId, materialType, storageFileName } = materials[0];

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_METADATA,
    Action.MUTATE,
    { courseId, instanceId }
  );

  if (!userId) return;

  if (!materials || materials.length === 0) {
    return res.status(404).send('Material not found');
  }

  const dbResult = await executeAndEndSet500OnError(
    `DELETE FROM CourseMaterials WHERE id = ?`,
    [id],
    res
  );

  if (!dbResult) return;

  const material = materials[0];
  if (material.materialType === 'FILE' && material.storageFileName) {
    const filePath = path.join(BASE_PATH, material.storageFileName);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Deleted file:', filePath);
      } else {
        console.log('File not found for deletion:', filePath);
      }
    } catch (deleteError) {
      console.error('Error deleting file:', deleteError);
    }
  }

  return res.status(200).end();
}
