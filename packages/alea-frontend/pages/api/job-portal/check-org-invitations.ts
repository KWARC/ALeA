import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfGetOrSetError, executeDontEndSet500OnError } from '../comment-utils';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const { organizationId, email } = req.query;

  const inviteStatus = await checkInviteToOrgOrSet500OnError(
    organizationId as string,
    email as string,
    res
  );
  if (!inviteStatus) return;

  return res.status(200).json(inviteStatus);
}
