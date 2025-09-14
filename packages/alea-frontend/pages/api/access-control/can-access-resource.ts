import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from './resource-utils';
import { Action, ResourceName } from '@alea/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const { resourceName, actionId, ...variables } = req.query;
  if (!resourceName || !actionId) return res.status(422).send({ messge: `Missing params.` });
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    resourceName as ResourceName,
    actionId as Action,
    variables as Record<string, string>
  );
  if (!userId) return res.status(403).send({ message: `Not authorized.` });
  return res.status(200).send(true);
}
