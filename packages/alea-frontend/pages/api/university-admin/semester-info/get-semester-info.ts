import { NextApiRequest, NextApiResponse } from 'next';
import { Action, ResourceName } from '@stex-react/utils';
import { getUserIdIfAuthorizedOrSetError } from '../../access-control/resource-utils';
import { executeQuery, checkIfGetOrSetError } from '../../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;

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

  const { universityId, instanceId } = req.query;

  const data = (await executeQuery(
    `
    SELECT * FROM semesterInfo
    WHERE universityId = ? AND instanceId = ?
    `,
    [universityId, instanceId]
  )) as any[] | { error: any };

  if ('error' in data) {
    return res.status(500).end('Database error');
  }

  res.status(200).json({ semesterInfo: data });
}
