import { Action, ResourceName } from '@alea/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from '../access-control/resource-utils';
import { checkIfPostOrSetError, executeAndEndSet500OnError, executeQueryAndEnd } from '../comment-utils';
import { addRemoveMemberOrSetError } from '../access-control/add-remove-member';
import { getOrgAcl } from './register-recruiter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const { orgId, email } = req.body;
  if (!email || !orgId ) return res.status(422).send('Email or OrgId missing');
  const inviterId = await getUserIdIfAuthorizedOrSetError(
    req,
    res,
    ResourceName.JOB_PORTAL_ORG,
    Action.MANAGE_JOB_POSTS,
    { orgId }
  );
  if (!inviterId) return;

  const existingInvite:any[] = await executeAndEndSet500OnError(
    `SELECT id FROM orgInvitations WHERE inviteeEmail = ? AND organizationId = ? AND inviteruserId =?`,
    [email, orgId, inviterId],
    res
  );
  if (!existingInvite) return;
  if (existingInvite.length) return res.status(409).send('Invitation already exists');

  const result = await executeAndEndSet500OnError(
    `INSERT INTO orgInvitations (inviteruserId, inviteeEmail,organizationId) VALUES (?, ?, ?)`,
    [inviterId, email, orgId],
    res
  );
  if (!result) return;
//TODO:acl addition step will be removed in coming iteration
  const success = await addRemoveMemberOrSetError(
    {
      memberId: email,
      aclId: getOrgAcl(orgId),
      isAclMember: false,
      toBeAdded: true,
    },
    req,
    res
  );
  if (!success) {
    // Rollback
    await executeQueryAndEnd(
      `DELETE FROM orgInvitations WHERE inviteruserId = ? AND inviteeEmail = ? AND organizationId = ?`,
      [inviterId, email, orgId]
    );
    return;
  }

  res.status(201).end();
}
