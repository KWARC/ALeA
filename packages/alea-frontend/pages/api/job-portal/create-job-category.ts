import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.JOB_PORTAL,
    Action.MANAGE_JOB_TYPES,
    { instanceId: CURRENT_TERM }
  );
  if (!userId) return;
  const { jobCategory, internshipPeriod, startDate, endDate } = req.body;
  if(!jobCategory) return res.status(422).send("Missing job category"); 
  let instanceId = req.body.instanceId as string;
  if (!instanceId) instanceId = CURRENT_TERM;

  const result = await executeAndEndSet500OnError(
    `INSERT INTO jobCategories 
      (jobCategory,internshipPeriod,startDate,endDate,instanceId) 
     VALUES (?, ?, ?, ?,?)`,
    [jobCategory, internshipPeriod, startDate, endDate, instanceId],
    res
  );
  if (!result) return;
  res.status(201).end();
}
