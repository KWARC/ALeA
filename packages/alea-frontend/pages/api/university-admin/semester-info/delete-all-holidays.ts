import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@stex-react/utils';
import { getUserIdIfAuthorizedOrSetError } from '../../access-control/resource-utils';
import { executeQuery, checkIfPostOrSetError } from '../../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.UNIVERSITY_SEMESTER_DATA,
    Action.MUTATE,
    {
      universityId: Array.isArray(req.query.universityId)
        ? req.query.universityId[0]
        : req.query.universityId,
    }
  );
  if (!userId) return;

  const { universityId, instanceId } = req.body;

  if (!universityId || !instanceId) {
    return res.status(400).end();
  }

  const result = (await executeQuery(
    `
      UPDATE semesterInfo
      SET holidays = '[]', userId = ?
      WHERE universityId = ? AND instanceId = ?
      `,
    [userId, universityId, instanceId]
  )) as { affectedRows: number };

  if (result.affectedRows === 0) {
    return res.status(404).end();
  }

  res.status(200).json(result);
}
