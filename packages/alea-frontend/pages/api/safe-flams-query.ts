import { getQueryResults } from '@alea/spec';
import { createSafeFlamsQuery } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError } from './comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  // See packages/utils/src/lib/flams-query-creator.ts for supported parameterization format.
  const { query, uriParams, dryRun } = req.body;

  if (!query || typeof query !== 'string') return res.status(400).send('query is invalid.');

  if (typeof uriParams !== 'object') return res.status(400).send('uriParams is invalid.');

  const actualQuery = createSafeFlamsQuery(query, uriParams);
  const results = !dryRun ? undefined : await getQueryResults(actualQuery);
  return res.status(200).json({ actualQuery, results });
}
