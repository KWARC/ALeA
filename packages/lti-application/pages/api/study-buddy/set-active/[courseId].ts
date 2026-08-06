import type { NextApiRequest, NextApiResponse } from 'next';
import { setStudyBuddyActiveInDb } from '@alea/node-utils';
import {
  checkIfPostOrSetError,
  getApiErrorResponse,
  getLtiStudyBuddyScope,
} from '../../../../lib/study-buddy-api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const context = getLtiStudyBuddyScope(req, res);
  if (!context) return;

  const { active } = req.body;
  if (active === undefined) {
    res.status(400).send('Missing [active]');
    return;
  }

  try {
    await setStudyBuddyActiveInDb({
      ...context.scope,
      active,
    });

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).send(getApiErrorResponse(error));
  }
}
