import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeDontEndSet500OnError,
} from '../comment-utils';
import { JobCategoryInfo } from '@stex-react/api';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, ResourceName } from '@stex-react/utils';

export type DbJobCategoryInfo = JobCategoryInfo & {
  updatedAt: Date;
  createdAt: Date;
  instanceId: string;
};

export async function getJobCategoryUsingIdOrSet500OnError(
  id: number,
  res: NextApiResponse
): Promise<DbJobCategoryInfo | undefined> {
  const results: any = await executeDontEndSet500OnError(
    'SELECT * FROM jobCategories WHERE id = ?',
    [id],
    res
  );
  if (!results || !results.length) return;
  return results[0] as DbJobCategoryInfo;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { id, jobCategory, startDate, endDate, internshipPeriod } = req.body as JobCategoryInfo;
  if (!id) return res.status(422).send('jobCategory id is missing');

  const currentJobCategory = await getJobCategoryUsingIdOrSet500OnError(id, res);
  if (!currentJobCategory) return;
  const { instanceId, updatedAt } = currentJobCategory;

  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.JOB_PORTAL,
    Action.MANAGE_JOB_TYPES,
    { instanceId: instanceId }
  );
  if (!userId) return;

  const result = await executeAndEndSet500OnError(
    'UPDATE jobCategories SET jobCategory = ?, internshipPeriod = ?, startDate = ?, endDate = ?, updatedAt=? WHERE id = ?',
    [jobCategory, internshipPeriod, startDate, endDate, updatedAt, id],
    res
  );
  if (!result) return;

  res.status(200).end();
}
