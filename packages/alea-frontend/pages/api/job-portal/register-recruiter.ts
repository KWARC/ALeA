import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError, executeDontEndSet500OnError, getUserIdOrSetError } from '../comment-utils';
import { unsafeCreateResourceAccessUnlessForced } from '../access-control/create-resourceaction';
import { createAclOrSetError } from '../access-control/create-acl';
import { deleteAclOrSetError } from '../access-control/delete-acl';
import { RecruiterData } from '@alea/spec';
import { getDomainFromEmail, isFauId } from '@alea/utils';
import { getRecruiterProfileByUserIdOrSet500OnError } from './get-recruiter-profile';
import { getOrganizationProfileByIdOrSet500OnError } from './get-organization-profile';

export function getOrgAcl(orgId: number) {
  return `org${orgId}-recruiters`;
}

export async function checkInviteToOrgOrSet500OnError(
  organizationId: string,
  email: string,
  res: NextApiResponse
) {
  if (!organizationId || !email) {
    res.status(422).send('Missing organizationId or email.');
    return;
  }

  const result: any = await executeDontEndSet500OnError(
    `SELECT COUNT(*) AS count FROM orgInvitations WHERE organizationId = ? AND inviteeEmail = ?`,
    [organizationId, email],
    res
  );
  if (!result) return;
  const count = result[0]?.count ?? 0;
  return { hasInvites: count > 0 };
}

export async function getOrganizationByDomainOrSet500OnError(domain: string, res: NextApiResponse) {
  const results: any = await executeDontEndSet500OnError(
    `SELECT id, companyName, domain FROM organizationProfile WHERE domain = ? LIMIT 1`,
    [domain],
    res
  );
  if (!results) return;
  return results;
}

export async function createRecruiterProfileOrSet500OnError(
  {
    name,
    userId,
    email,
    position,
    organizationId,
  }: { name: string; userId: string; email: string; position: string; organizationId: number },
  res: NextApiResponse
) {
  if (!userId || isFauId(userId)) {
    res.status(403).send('Invalid or unauthorized user');
    return;
  }
  if (!name || !email || !position || !organizationId)
    return res.status(422).send('Missing required fields');
  const result = await executeAndEndSet500OnError(
    `INSERT INTO recruiterProfile 
      (name, userId, email, position, organizationId) 
     VALUES (?, ?, ?, ?, ?)`,
    [name, userId, email, position, organizationId],
    res
  );
  return result;
}

//risky , donot use unless necessary.
async function deleteRecruiterProfileOrSetError(userId: string, res: NextApiResponse) {
  if (!userId) return res.status(422).send('Recruiter userId is missing');
  const recruiter = await getRecruiterProfileByUserIdOrSet500OnError(userId, res);
  if (!recruiter) return;
  const result = await executeAndEndSet500OnError(
    'DELETE FROM recruiterProfile WHERE userId = ?',
    [userId],
    res
  );
  if (!result) return;
  return true;
}


export async function deleteOrganizationProfileOrSetError(id: number, res: NextApiResponse) {
  if (!id) return res.status(422).send('Organization id is missing');
  const orgProfile = await getOrganizationProfileByIdOrSet500OnError(id, res);
  if (!orgProfile) return;
  const result = await executeAndEndSet500OnError(
    'DELETE FROM organizationProfile WHERE id = ?',
    [id],
    res
  );
  if (!result) return;
  return true;
}

async function createOrganizationProfileOrSet500OnError(
  {
    companyName,
    domain,
    incorporationYear = null,
    isStartup = null,
    website = null,
    about = null,
    companyType = null,
    officeAddress = null,
    officePostalCode = null,
  }: {
    companyName: string;
    domain: string;
    incorporationYear?: string | null;
    isStartup?: boolean | null;
    website?: string | null;
    about?: string | null;
    companyType?: string | null;
    officeAddress?: string | null;
    officePostalCode?: string | null;
  },
  res: NextApiResponse
) {
  if (!companyName || !domain) return res.status(422).send('Missing required params');
  const result = await executeAndEndSet500OnError(
    `INSERT INTO organizationProfile 
      (companyName, incorporationYear, isStartup, website, domain, about, companyType, officeAddress, officePostalCode) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyName,
      incorporationYear,
      isStartup,
      website,
      domain,
      about,
      companyType,
      officeAddress,
      officePostalCode,
    ],
    res
  );
  return result;
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

  if (!email || !name || !position || !companyName) {
    return res.status(422).send('Missing required fields');
  }
  const domain = getDomainFromEmail(email);
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
