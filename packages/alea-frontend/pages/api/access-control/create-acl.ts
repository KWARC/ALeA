import { AccessControlList } from '@stex-react/api';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, executeAndEndSet500OnError } from '../comment-utils';
import { areMemberUsersAndAclIdsValid } from '../acl-utils/acl-common-utils';

export async function createAclOrSetError(
  acl: {
    id: string;
    description: string;
    isOpen: boolean;
    updaterACLId: string;
    memberUserIds: string[];
    memberACLIds: string[];
  },
  res: NextApiResponse
) {
  const { id, description, isOpen, updaterACLId, memberUserIds, memberACLIds } = acl;

  if (
    !id ||
    !updaterACLId ||
    isOpen === null ||
    isOpen === undefined ||
    !memberUserIds ||
    !memberACLIds
  ) {
    return res.status(422).send('Missing required fields.');
  }
  if (!(await areMemberUsersAndAclIdsValid(memberUserIds, memberACLIds))) {
    return res.status(422).send('Invalid items');
  }
  const result = await executeAndEndSet500OnError(
    'INSERT INTO AccessControlList (id, description, updaterACLId, isOpen) VALUES (?,?, ?,?)',
    [id, description, updaterACLId, isOpen],
    res
  );
  if (!result) return;

  const numMembershipRows = memberUserIds.length + memberACLIds.length;
  if (numMembershipRows > 0) {
    const values = new Array(numMembershipRows).fill('(?, ?, ?)');
    const memberQueryParams = [];
    for (const userId of memberUserIds) memberQueryParams.push(id, null, userId);
    for (const aclId of memberACLIds) memberQueryParams.push(id, aclId, null);

    const memberQuery = `INSERT INTO ACLMembership (parentACLId, memberACLId, memberUserId) VALUES 
    ${values.join(', ')}`;
    const resp = await executeAndEndSet500OnError(memberQuery, memberQueryParams, res);
    if (!resp) return;
  }
  return true;
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const acl = req.body as AccessControlList;
  const { id, description, isOpen, updaterACLId, memberUserIds, memberACLIds } = acl;
  const result = await createAclOrSetError(
    {
      id,
      description,
      isOpen,
      updaterACLId: updaterACLId ?? id,
      memberUserIds,
      memberACLIds,
    },
    res
  );
  if (!result) return;
  res.status(201).end();
}
