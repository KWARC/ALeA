import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfPostOrSetError, getUserIdOrSetError, executeQuery } from '../../../comment-utils';
import { createCourseMemberAclBackend } from '../../../acl-utils/instructor-dasboard-utils/createMemberAcl';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const { courseId } = req.body;

  if (!courseId) {
    return res.status(400).json({ message: 'Missing courseId' });
  }

  try {
    const result = await createCourseMemberAclBackend(courseId, userId);
    return res.status(200).json({ success: true, aclId: result.aclId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
