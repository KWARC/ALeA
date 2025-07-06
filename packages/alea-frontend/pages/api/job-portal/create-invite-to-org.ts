import { Action, ResourceName } from '@stex-react/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { orgId, email } = req.body;
  if (!email || !orgId) return res.status(422).send('Email or OrgId missing');
  const inviterId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.JOB_PORTAL_ORG,
    Action.MANAGE_JOB_POSTS,
    { orgId }
  );
  if (!inviterId) return;

  const result = await executeAndEndSet500OnError(
    `INSERT INTO orgInvitations (inviteruserId, inviteeEmail,organizationId) VALUES (?, ?, ?)`,
    [inviterId, email, orgId],
    res
  );

  if (!result) return;
  res.status(201).end();
}
