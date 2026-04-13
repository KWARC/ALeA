import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError, executeDontEndSet500OnError } from '../comment-utils';
import { ACLMembership } from './acl-membership';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = req.query.id as string;
  if (!id) return res.status(422).send(`Missing param id.`);
  const acls: any[] = await executeAndEndSet500OnError(
    `SELECT id FROM AccessControlList where id = ?`,
    [id],
    res
  );
  if (!acls?.[0]) return res.status(404).send(`No ACL with id [${id}].`);

  const members: ACLMembership[] = await executeAndEndSet500OnError(
    'SELECT memberUserId FROM ACLMembership WHERE parentACLId = ? AND memberUserId IS NOT NULL',
    [id],
    res
  );
  const directMembers = members.map((m) => m.memberUserId).filter((u) => u);
  if (directMembers.length === 0) {
    return res.status(200).send([]);
  }
  const placeholders = directMembers.map(() => '?').join(',');
  const userInfoResults: { firstName: string; lastName: string; userId: string }[] =
    await executeDontEndSet500OnError(
      `select firstName, lastName, userId from userInfo where userId IN (${placeholders})`,
      directMembers,
      res
    );
  const result = directMembers.map((userId) => {
    const userInfo = userInfoResults.find((record) => record.userId === userId);
    const fullName = userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : '';
    return { fullName, userId };
  });
  res.status(200).send(result);
}
