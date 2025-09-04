import { AccessControlList } from '@stex-react/spec';
import { NextApiRequest, NextApiResponse } from 'next';
import { executeAndEndSet500OnError } from '../comment-utils';
import { ACLMembership } from './acl-membership';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = req.query.id as string;
  if (!id) return res.status(422).send(`Missing param id.`);
  const acls: any[] = await executeAndEndSet500OnError(
    `SELECT * FROM AccessControlList where id = ?`,
    [id],
    res
  );
  const dbAcl = acls?.[0];
  if (!dbAcl) return res.status(404).send(`No ACL with id [${id}].`);

  const members: ACLMembership[] = await executeAndEndSet500OnError(
    'SELECT * FROM ACLMembership WHERE parentACLId = ?',
    [id],
    res
  );
  const acl: AccessControlList = {
    id,
    description: dbAcl.description,
    isOpen: !!dbAcl.isOpen,
    updaterACLId: dbAcl.updaterACLId,
    createdAt: dbAcl.createdAt,
    updatedAt: dbAcl.updatedAt,

    memberACLIds: members.map((m) => m.memberACLId).filter((a) => a),
    memberUserIds: members.map((m) => m.memberUserId).filter((u) => u),
  };
  res.status(200).send(acl);
}
