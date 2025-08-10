// File: packages/alea-frontend/pages/api/university-admin/semester-info/delete-semester.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@stex-react/utils';
import { getUserIdIfAuthorizedOrSetError } from '../../access-control/resource-utils';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const { universityId: queryUniversityId } = req.query;
  if (!queryUniversityId || typeof queryUniversityId !== 'string') {
    return res.status(400).send('Invalid university id');
  }

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.UNIVERSITY_SEMESTER_DATA,
    Action.MUTATE,
    { universityId: queryUniversityId }
  );
  if (!userId) return;

  const { universityId, instanceId } = req.body;

  if (!universityId || !instanceId) {
    return res.status(400).end();
  }

  await executeAndEndSet500OnError(
    `
    DELETE FROM semesterInfo
    WHERE universityId = ? AND instanceId = ?
    `,
    [universityId, instanceId],
    res
  );

  res.status(204).end();
}
