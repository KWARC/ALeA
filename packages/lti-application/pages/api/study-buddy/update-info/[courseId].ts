import type { NextApiRequest, NextApiResponse } from 'next';
import type { StudyBuddy } from '@alea/spec';
import { updateStudyBuddyInfoInDb } from '@alea/node-utils';
import {
  checkIfPostOrSetError,
  getApiErrorResponse,
  getLtiStudyBuddyScope,
} from '../../../../lib/study-buddy-api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const context = getLtiStudyBuddyScope(req, res);
  if (!context) return;

  try {
    await updateStudyBuddyInfoInDb({
      ...context.scope,
      userName: context.session.user.name,
      studyBuddy: req.body as StudyBuddy,
    });

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).send(getApiErrorResponse(error));
  }
}
