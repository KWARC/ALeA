import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeDontEndSet500OnError,
} from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, getCurrentTermForUniversity, ResourceName } from '@alea/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { sourceMaterialId, sourceInstanceId, courseId, universityId } = req.body;
  if (!sourceMaterialId || !courseId || !universityId || !sourceInstanceId) {
    return res
      .status(422)
      .send('Missing required fields: sourceMaterialId, courseId, universityId,sourceInstanceId');
  }
  const currInstanceId = getCurrentTermForUniversity(universityId);
  if (!currInstanceId) return res.status(422).send('InstanceId not found');
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.COURSE_METADATA,
    Action.MUTATE,
    { courseId: courseId, instanceId: currInstanceId }
  );

  if (!userId) return;

  const materials = (await executeDontEndSet500OnError(
    `SELECT * FROM CourseMaterials WHERE id = ?`,
    [sourceMaterialId],
    res
  )) as any[];
  if (!materials) return;

  if (materials.length === 0) {
    return res.status(404).send('Source material not found');
  }

  const material = materials[0];

  if (material.materialType === 'FILE') {
    const duplicateCheck = (await executeDontEndSet500OnError(
      `SELECT id FROM CourseMaterials WHERE checksum = ? AND courseId = ? AND instanceId = ?`,
      [material.checksum, courseId, currInstanceId],
      res
    )) as any[];
    if (!duplicateCheck) return;
    if (duplicateCheck.length > 0) {
      return res.status(409).json({ message: 'This file already exists in the current semester.' });
    }
  } else if (material.materialType === 'LINK') {
    const duplicateCheck = (await executeDontEndSet500OnError(
      `SELECT id FROM CourseMaterials WHERE url = ? AND courseId = ? AND instanceId = ?`,
      [material.url, courseId, currInstanceId],
      res
    )) as any[];
    if (!duplicateCheck) return;
    if (duplicateCheck.length > 0) {
      return res.status(409).json({ message: 'This link already exists in the current semester.' });
    }
  }

  const newMaterialId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  const dbResult = await executeAndEndSet500OnError(
    `INSERT INTO CourseMaterials 
     (id, materialName, materialType, storageFileName, mimeType, sizeBytes,
      universityId, courseId, instanceId, uploadedBy, url, checksum)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newMaterialId,
      material.materialName,
      material.materialType,
      material.storageFileName,
      material.mimeType,
      material.sizeBytes,
      material.universityId,
      material.courseId,
      currInstanceId,
      userId,
      material.url,
      material.checksum,
    ],
    res
  );
  if (!dbResult) return;
  return res.status(201).end();
}
