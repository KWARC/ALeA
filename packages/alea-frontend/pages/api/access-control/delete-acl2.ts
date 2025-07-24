// File: packages/aleaf-frontend/pages/api/deleteAcl.ts

import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeTxnAndEndSet500OnError,
  // Assuming 'db' or a connection pool is available for direct queries
  // You might need to import your database connection utility here
  // For example:
  // getDbConnection // if you have a utility to get a DB connection
} from '../comment-utils'; // Or wherever your database connection/query functions reside
import { isCurrentUserMemberOfAClupdater } from '../acl-utils/acl-common-utils';

// You'll likely need your database connection or query function here
// For demonstration, let's assume executeQuery is available
// from your 'comment-utils' or a separate 'db-utils' file
// You might need to import it, e.g.,:
// import { executeQuery } from '../path/to/your/db-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const id = req.body.id as string;
  if (!id || typeof id !== 'string') {
    return res.status(422).json({ message: 'Missing ACL ID.' }); // Changed to .json()
  }

  // First, check if the current user has permission to update/delete this ACL
  if (!(await isCurrentUserMemberOfAClupdater(id, res, req))) {
    return res
      .status(403)
      .json({ message: 'Forbidden: You do not have permission to delete this ACL.' }); // Changed to .json()
  }

  // --- CRITICAL NEW LOGIC: Check for existing assignments ---
  try {
    // IMPORTANT: Replace 'Users', 'userACLId', 'Resources', 'resourceACLId'
    // with your actual table and column names where ACLs are referenced.

    console.log("shubham");
    const userAssignments = await executeTxnAndEndSet500OnError(
      res,
      'SELECT 1 FROM Users WHERE defaultACLId = ? LIMIT 1', // Assuming a 'Users' table with a 'defaultACLId'
      [id],
      null,
      null
    );
    console.log("kumar")
    if (userAssignments && userAssignments.length > 0) {
      return res.status(409).json({
        message:
          'Failed to delete ACL. It is currently assigned as the default ACL for one or more users.',
      });
    }

    // 2. Check if this ACL is assigned to any resources (e.g., documents, projects, etc.)
    // You might have multiple resource tables. Add more checks here if needed.
    const resourceAssignments = await executeTxnAndEndSet500OnError(
      res,
      'SELECT 1 FROM Resources WHERE accessACLId = ? LIMIT 1', // Assuming a 'Resources' table with 'accessACLId'
      [id],
      null,
      null
    );
    if (resourceAssignments && resourceAssignments.length > 0) {
      return res.status(409).json({
        message: 'Failed to delete ACL. It is currently assigned to one or more resources.',
      });
    }

    // 3. NEW CHECK: Check if this ACL *has* direct members (i.e., it is a parent ACL in ACLMembership)
    // Deleting an ACL that has members can leave orphaned records or unexpected behavior.
    const hasDirectMembers = await executeTxnAndEndSet500OnError(
      res,
      'SELECT 1 FROM ACLMembership WHERE parentACLId = ? LIMIT 1',
      [id],
      null,
      null
    );
    if (hasDirectMembers && hasDirectMembers.length > 0) {
      return res.status(409).json({
        message:
          'Failed to delete ACL. It still has direct members (users or other ACLs) assigned to it. Please remove its members first.',
      });
    }

    // 4. Check if this ACL is listed as a memberACLId in other ACLs (i.e., it is a child member of another ACL)
    const isMemberOfOtherAcls = await executeTxnAndEndSet500OnError(
      res,
      'SELECT 1 FROM ACLMembership WHERE memberACLId = ? LIMIT 1',
      [id],
      null,
      null
    );
    if (isMemberOfOtherAcls && isMemberOfOtherAcls.length > 0) {
      return res.status(409).json({
        message:
          'Failed to delete ACL. It is a member of other ACLs. Please remove it from parent ACLs first.',
      });
    }

    // --- END CRITICAL NEW LOGIC ---

    // If no assignments or memberships are found where this ACL is referenced, proceed with deletion
    // The second query here effectively deletes ACLMembership entries where THIS ACL is the PARENT,
    // but the above check (hasDirectMembers) prevents reaching this if it still *has* members.
    // So, this second delete might only run if you bypass the check above, or if an ACL *can* be empty.
    const result = await executeTxnAndEndSet500OnError(
      res,
      'DELETE FROM AccessControlList WHERE id=?',
      [id],
      'DELETE FROM ACLMembership WHERE parentACLId=?', // This deletes memberships where THIS ACL is the parent
      [id]
    );

    if (!result) return; // executeTxnAndEndSet500OnError handles the error response

    res.status(200).json({ message: `ACL ${id} successfully deleted.` }); // Changed to .json()
  } catch (error) {
    console.error(`Error during ACL deletion for ID ${id}:`, error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'An unexpected error occurred during ACL deletion.' });
    }
  }
}
