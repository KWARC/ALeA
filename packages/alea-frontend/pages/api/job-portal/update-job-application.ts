import { NextApiRequest, NextApiResponse } from 'next';
import { APPLICANT_ACTIONS, ApplicationAction, RECRUITER_ACTIONS } from '@alea/spec';
import { Action, CURRENT_TERM, ResourceName } from '@alea/utils';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  executeTxnAndEndSet500OnError,
} from '../comment-utils';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';

const ACTION_TO_STATUS: Record<string, string> = {
  WITHDRAW_APPLICATION: 'APPLICATION_WITHDRAWN',
  ACCEPT_OFFER: 'OFFER_ACCEPTED',
  REJECT_OFFER: 'OFFER_REJECTED',
  SHORTLIST_FOR_INTERVIEW: 'SHORTLISTED_FOR_INTERVIEW',
  ON_HOLD: 'ON_HOLD',
  REJECT: 'REJECTED',
  SEND_OFFER: 'OFFERED',
  REVOKE_OFFER: 'OFFER_REVOKED',
};

async function getUserIdAndRoleIfAuthorizedOrSetError(
  req: NextApiRequest,
  res: NextApiResponse,
  applicationId: number,
  action: ApplicationAction
) {
  const application: any[] = await executeAndEndSet500OnError(
    `
    SELECT 
      ja.applicantId,
      jp.organizationId
    FROM jobApplication ja
    JOIN jobPost jp ON ja.jobPostId = jp.id
    WHERE ja.id = ?
    `,
    [applicationId],
    res
  );
  if (!application) return;
  if (!application.length) {
    res.status(404).send('Job Application not found');
    return;
  }
  const { applicantId, organizationId } = application[0];

  if (APPLICANT_ACTIONS.has(action)) {
    const userId = await getUserIdIfAuthorizedOrSetError(
      req,
      res,
      ResourceName.JOB_PORTAL,
      Action.APPLY,
      { instanceId: CURRENT_TERM }
    );
    if (!userId) return;

    if (userId !== applicantId) {
      return res.status(403).send('Cannot modify another applicant’s application');
    }

    return {
      userId,
      role: 'APPLICANT',
    };
  }
  if (RECRUITER_ACTIONS.has(action)) {
    const userId = await getUserIdIfAuthorizedOrSetError(
      req,
      res,
      ResourceName.JOB_PORTAL_ORG,
      Action.MANAGE_JOB_POSTS,
      { orgId: organizationId }
    );
    if (!userId) return;

    return {
      userId,
      role: 'RECRUITER',
    };
  }

  return res.status(400).send('Invalid application action');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { id, action, message } = req.body;
  if (!id || !action) return res.status(422).send('Job Application Id or Action is missing');
  const userIdAndRole = await getUserIdAndRoleIfAuthorizedOrSetError(req, res, id, action);
  if (!userIdAndRole) return;
  const { userId, role } = userIdAndRole;
  const newStatus = ACTION_TO_STATUS[action];
  if (!newStatus) return res.status(400).send('Action not valid');
  const result = await executeTxnAndEndSet500OnError(
    res,
    `INSERT INTO jobApplicationAction
      (jobApplicationId, actionByRole, userId, actionType, message)
    VALUES (?, ?, ?, ?, ?)`,
    [id, role, userId, action, message || null],
    `
    UPDATE jobApplication
    SET applicationStatus = ?, updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [newStatus, id]
  );
  if (!result) return;
  res.status(200).end();
}
