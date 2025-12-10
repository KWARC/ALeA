import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, getUserIdOrSetError } from '../comment-utils';
import { CURRENT_TERM } from '@alea/utils';
import { unsafeCreateResourceAccessUnlessForced } from '../access-control/create-resourceaction';
import { checkInviteToOrgOrSet500OnError } from './check-org-invitations';
import { getOrganizationByDomainOrSet500OnError } from './get-org-by-domain';
import { createOrganizationProfileOrSet500OnError } from './create-organization-profile';
import { createRecruiterProfileOrSet500OnError } from './create-recruiter-profile';
import { createAclOrSetError } from '../access-control/create-acl';
import { addRemoveMemberOrSetError } from '../access-control/add-remove-member';
import { deleteAclOrSetError } from '../access-control/delete-acl';
import { RecruiterData } from '@alea/spec';
import { deleteRecruiterProfileOrSetError } from './delete-recruiter-profile';
import { deleteOrganizationProfileOrSetError } from './delete-organization-profile';

export function getOrgAcl(orgId: number) {
  return `org${orgId}-recruiters`;
}
export async function createNewOrganizationAndRecruiterOrSetError(
  companyName: string,
  domain: string,
  recruiterData: { name: string; email: string; position: string },
  userId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  let orgId: number;
  let aclResult: boolean | void;
  let recruiter: RecruiterData;
  try {
    const organizationData = { companyName, domain };
    const result = await createOrganizationProfileOrSet500OnError(organizationData, res);
    if (!result) throw new Error('Failed to create Organization Profile');
    orgId = result?.insertId;
    recruiter = await createRecruiterProfileOrSet500OnError(
      { ...recruiterData, userId: userId, organizationId: orgId },
      res
    );
    if (!recruiter) throw new Error('Failed to create Recruiter Profile');
    const newAcl = {
      id: getOrgAcl(orgId),
      description: `Recruiters of ${companyName}`,
      memberUserIds: [userId],
      memberACLIds: [],
      updaterACLId: getOrgAcl(orgId),
      isOpen: false,
    };
    aclResult = await createAclOrSetError(newAcl, res);
    if (!aclResult) {
      throw new Error('Failed to create ACL');
    }
    const resourceId = `/job-portal-org/${orgId}`;
    const actionId = 'MANAGE_JOB_POSTS';
    const aclId = getOrgAcl(orgId);
    const resourceAccessResult = await unsafeCreateResourceAccessUnlessForced(
      resourceId,
      actionId,
      aclId,
      res
    );
    if (!resourceAccessResult) {
      throw new Error('Failed to create resource acess');
    }
    return true;
  } catch (error) {
    // Rollback
    if (orgId) {
      await deleteOrganizationProfileOrSetError(orgId, res);
    }
    if (recruiter) {
      await deleteRecruiterProfileOrSetError(recruiter?.userId, res);
    }
    if (aclResult) {
      await deleteAclOrSetError(getOrgAcl(orgId), req, res);
    }
    if (res.writableEnded) return;
    return res.status(500).send({
      message: 'An error occurred while creating organization and recruiter',
    });
  }
}

export async function createRecruiterOrSetError(
  recruiterData: { name: string; email: string; position: string },
  orgId: number,
  userId: string,
  res: NextApiResponse
) {
  const recruiter = await createRecruiterProfileOrSet500OnError(
    { ...recruiterData, userId, organizationId: orgId },
    res
  );
  if (!recruiter) return;
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;
  const { name, email, position, companyName } = req.body;

  if (!email || !name || !position || !userId) {
    return res.status(422).send('Missing required fields');
  }
  const domain = email.split('@')[1];
  const existingOrg = await getOrganizationByDomainOrSet500OnError(domain, res);
  if (existingOrg.length > 0) {
    const orgId = existingOrg[0].id;
    const inviteResp = await checkInviteToOrgOrSet500OnError(orgId, email, res);
    const hasInvite = inviteResp?.hasInvites;
    if (!hasInvite) {
      return res.status(200).json({ message: 'No invite found', showInviteDialog: true });
    }
    const result = await createRecruiterOrSetError(
      { name, email, position },
      orgId,
      userId,
      res
    );
    if (!result) return;
    return res
      .status(200)
      .json({ message: 'Recruiter profile created successfully', showProfilePopup: true });
  }
  const result = await createNewOrganizationAndRecruiterOrSetError(
    companyName,
    domain,
    { name, email, position },
    userId,
    req,
    res
  );
  if (!result) return;

  return res.status(200).json({
    message: 'Recruiter profile and organization created successfully',
    showProfilePopup: true,
  });
}
