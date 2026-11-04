import { NextApiRequest, NextApiResponse } from 'next';
import { requireCurrentUserIsSysAdmin } from '../acl-utils/acl-common-utils';
import { checkIfGetOrSetError, executeAndEndSet500OnError } from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  if (!(await requireCurrentUserIsSysAdmin(req, res))) return;
  const result: any[] = await executeAndEndSet500OnError(
    'select id from AccessControlList',
    [],
    res
  );
  res.status(200).send(result?.map((r) => r.id) ?? []);
}
