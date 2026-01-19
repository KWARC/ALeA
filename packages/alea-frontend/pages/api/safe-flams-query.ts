import { createSafeFlamsQuery } from '@alea/spec';
import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError } from './comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  // See packages/utils/src/lib/flams-query-creator.ts for supported parameterization format.
  const { query, uriParams, dryRun } = req.body;

  if (!query || typeof query !== 'string') return res.status(400).send('query is invalid.');

  const safeUriParams = uriParams && typeof uriParams === 'object' ? uriParams : {};
  const actualQuery = createSafeFlamsQuery(query, safeUriParams);

  if (dryRun) return res.status(200).json({ actualQuery });

  try {
    const backendResponse = await axios.post(
      `${process.env['NEXT_PUBLIC_FLAMS_URL']}/api/backend/query`,
      new URLSearchParams({ query: actualQuery }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        // Allow all status codes so we can forward them as-is instead of throwing on non-2xx.
        validateStatus: () => true,
      }
    );

    return res.status(backendResponse.status).json(backendResponse.data);
  } catch (error) {
    console.error('Error executing FLAMS backend query:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error while executing FLAMS backend query.' });
  }
}
