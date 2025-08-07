import { executeQuery } from '@utils/comment-utils';

export async function createCourseMemberAclBackend(courseId: string, createdBy: string) {
  const aclId = `acl_${courseId}_members`;

  // Check for existing ACL
  const existing = await executeQuery(
    `SELECT 1 FROM AccessControlList WHERE id = ?`,
    [aclId]
  ) as any[];

  if (Array.isArray(existing) && existing.length > 0) {
    throw new Error('ACL already exists');
  }

  // Create ACL entry
  await executeQuery(
    `INSERT INTO AccessControlList (id, type, createdBy, createdAt) VALUES (?, 'course-members', ?, NOW())`,
    [aclId, createdBy]
  );

  // Link ACL to course
  await executeQuery(
    `UPDATE course SET memberACLId = ? WHERE id = ?`,
    [aclId, courseId]
  );

  return { aclId };
}
