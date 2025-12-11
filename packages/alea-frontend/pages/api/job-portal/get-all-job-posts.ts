import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  executeDontEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const results: any = await executeDontEndSet500OnError(
    `SELECT id,jobCategoryId,organizationId ,session,jobTitle,jobDescription,trainingLocation,qualification,targetYears,openPositions,currency,stipend,facilities,applicationDeadline,createdAt,workMode
    FROM jobPost`,
    [],
    res
  );
  if (!results) return;
  res.status(200).json(results);
}
