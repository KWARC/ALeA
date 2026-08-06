import type { NextApiRequest, NextApiResponse } from 'next';
import { getStudyBuddyUserInfoFromDb } from '@alea/node-utils';
import { getApiErrorResponse, getLtiStudyBuddyScope } from '../../../../lib/study-buddy-api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = getLtiStudyBuddyScope(req, res);
  if (!context) return;

  try {
    const result = await getStudyBuddyUserInfoFromDb(context.scope);
    if (!result) {
      res.status(404).end();
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send(getApiErrorResponse(error));
  }
}
