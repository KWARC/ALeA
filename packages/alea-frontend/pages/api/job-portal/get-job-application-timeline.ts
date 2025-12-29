import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  executeDontEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { Action, ResourceName } from '@alea/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const applicationId = req.query.applicationId as string;
  if (!applicationId) return res.status(422).send('Missing applicationId');

  const applications: any[] = await executeDontEndSet500OnError(
    `
    SELECT
      ja.id,
      ja.applicantId,
      jp.organizationId
    FROM jobApplication ja
    JOIN jobPost jp ON jp.id = ja.jobPostId
    WHERE ja.id = ?
    `,
    [applicationId],
    res
  );
  if (!applications) return;
  if (!applications.length) return res.status(404).send('Job Application Not found');

  if (applications[0].applicantId !== userId) {
    const recruiterId = await getUserIdIfAuthorizedOrSetError(
      req,
      res,
      ResourceName.JOB_PORTAL_ORG,
      Action.MANAGE_JOB_POSTS,
      { orgId: String(applications[0].organizationId) }
    );
    if (!recruiterId) return;
  }
  const timelines = await executeDontEndSet500OnError(
    `
        SELECT
          id,
          actionType,
          actionByRole,
          userId,
          message,
          createdAt
        FROM jobApplicationAction
        WHERE jobApplicationId = ?
        ORDER BY createdAt ASC
        `,
    [applicationId],
    res
  );

  if (!timelines) return;

  return res.status(200).json(timelines);
}
