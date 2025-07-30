import { Action, CURRENT_TERM, ResourceName } from '@stex-react/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { id } = req.body;
  let { instanceId } = req.body;
  if (!instanceId) instanceId = CURRENT_TERM;
  if (!id) return res.status(422).send('jobCategories id is missing');

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.JOB_PORTAL,
    Action.MANAGE_JOB_TYPES,
    { instanceId: instanceId }
  );
  if (!userId) return;

  const result = await executeAndEndSet500OnError(
    'DELETE FROM jobCategories WHERE id = ? AND instanceId =?',
    [id, instanceId],
    res
  );
  if (!result) return;
  res.status(200).end();
}
