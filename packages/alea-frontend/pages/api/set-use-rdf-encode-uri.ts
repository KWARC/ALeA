import { Action, ResourceName } from '@alea/utils';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from './access-control/resource-utils';
import { checkIfPostOrSetError } from './comment-utils';
import { setUseRdfEncodeUri } from './get-use-rdf-encode-uri';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.EXPERIMENTAL,
    Action.MUTATE
  );
  if (!userId) return;
  setUseRdfEncodeUri(!!req.body?.useRdfEncodeUri);
  return res.status(204).end();
}
