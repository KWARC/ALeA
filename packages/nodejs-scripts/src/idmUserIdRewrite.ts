import type mysql from 'serverless-mysql';

export type SqlDb = ReturnType<typeof mysql>;

export const COMMENT_PERSON_COLUMNS: { table: string; column: string }[] = [
  { table: 'Answer', column: 'userId' },
  { table: 'Grading', column: 'checkerId' },
  { table: 'comments', column: 'userId' },
  { table: 'StudyBuddyUsers', column: 'userId' },
  { table: 'StudyBuddyConnections', column: 'senderId' },
  { table: 'StudyBuddyConnections', column: 'receiverId' },
  { table: 'announcement', column: 'instructorId' },
  { table: 'excused', column: 'userId' },
  { table: 'homework', column: 'updaterId' },
  { table: 'homeworkHistory', column: 'updaterId' },
  { table: 'courseMetadata', column: 'updaterId' },
  { table: 'semesterInfo', column: 'userId' },
  { table: 'notifications', column: 'userId' },
  { table: 'points', column: 'userId' },
  { table: 'points', column: 'granterId' },
  { table: 'updateHistory', column: 'ownerId' },
  { table: 'updateHistory', column: 'updaterId' },
  { table: 'CheatSheet', column: 'userId' },
  { table: 'CheatSheet', column: 'uploadedByUserId' },
  { table: 'CheatSheetHistory', column: 'uploadedByUserId' },
  { table: 'CourseMaterials', column: 'uploadedBy' },
  { table: 'BlogPosts', column: 'authorId' },
  { table: 'studentProfile', column: 'userId' },
  { table: 'recruiterProfile', column: 'userId' },
  { table: 'jobApplication', column: 'applicantId' },
  { table: 'jobApplicationAction', column: 'userId' },
  { table: 'jobPost', column: 'createdByUserId' },
  { table: 'orgInvitations', column: 'inviteruserId' },
  { table: 'ACLMembership', column: 'memberUserId' },
];

export type RewriteSkipReason =
  | 'email_taken_by_other_account'
  | 'idm_id_bound_to_other_email'
  | 'no_userInfo_row'
  | 'not_verified'
  | 'query_error';

export type RewriteOneResult = {
  oldId: string;
  email: string;
  skipped?: RewriteSkipReason;
  skipDetail?: string;
  createdUserInfo: boolean;
  alreadyCanonical: boolean;
  columnUpdates: { table: string; column: string; rows: number }[];
  gradingRows: number;
  instructorJsonRows: number;
  commentsUserEmailRows: number;
};

type UserInfoHit = {
  userId: string;
  idmId: string | null;
  email: string | null;
  isVerified: number | boolean | null;
};

async function query<T>(db: SqlDb, sql: string, values: unknown[] = []): Promise<T> {
  const result = await db.query(sql, values);
  if (result && typeof result === 'object' && 'error' in (result as object)) {
    throw new Error(JSON.stringify((result as { error: unknown }).error));
  }
  return result as T;
}

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return 'unserializable error';
  }
}

function isMissingTable(err: unknown): boolean {
  const msg = errorText(err);
  return msg.includes("doesn't exist") || msg.includes('ER_NO_SUCH_TABLE');
}

async function countEq(db: SqlDb, table: string, column: string, value: string): Promise<number> {
  const rows = await query<{ n: number | bigint }[]>(
    db,
    `SELECT COUNT(*) AS n FROM \`${table}\` WHERE TRIM(${column}) = ?`,
    [value]
  );
  return Number(rows[0]?.n ?? 0);
}

function isOwnRow(row: UserInfoHit, oldId: string): boolean {
  return row.userId === oldId || row.idmId === oldId;
}

function skipResult(
  base: RewriteOneResult,
  skipped: RewriteSkipReason,
  skipDetail: string
): RewriteOneResult {
  return { ...base, skipped, skipDetail };
}

function isVerifiedFlag(value: number | boolean | null): boolean {
  return value === true || value === 1;
}

async function loadUserInfoHits(
  commentsDb: SqlDb,
  oldId: string,
  email: string
): Promise<{ own?: UserInfoHit; skip?: RewriteOneResult }> {
  const base: RewriteOneResult = {
    oldId,
    email,
    createdUserInfo: false,
    alreadyCanonical: false,
    columnUpdates: [],
    gradingRows: 0,
    instructorJsonRows: 0,
    commentsUserEmailRows: 0,
  };
  const infoRows = await query<UserInfoHit[]>(
    commentsDb,
    `SELECT userId, idmId, email, isVerified FROM userInfo
     WHERE userId = ? OR userId = ? OR idmId = ? OR LOWER(TRIM(email)) = ?`,
    [oldId, email, oldId, email]
  );
  const own = (infoRows || []).find((r) => isOwnRow(r, oldId));
  const emailHolder = (infoRows || []).find(
    (r) =>
      !isOwnRow(r, oldId) &&
      (r.userId.toLowerCase() === email.toLowerCase() ||
        (r.email ?? '').trim().toLowerCase() === email.toLowerCase())
  );
  if (emailHolder) {
    return { skip: skipResult(base, 'email_taken_by_other_account', emailHolder.userId) };
  }
  if (!own) {
    return { skip: skipResult(base, 'no_userInfo_row', oldId) };
  }
  if (!isVerifiedFlag(own.isVerified)) {
    return { skip: skipResult(base, 'not_verified', own.userId) };
  }
  if (own.idmId && own.idmId !== oldId) {
    return {
      skip: skipResult(
        base,
        'idm_id_bound_to_other_email',
        `row userId=${own.userId} idmId=${own.idmId}`
      ),
    };
  }
  return { own };
}

async function countPersonColumns(commentsDb: SqlDb, oldId: string) {
  const columnUpdates: { table: string; column: string; rows: number }[] = [];
  for (const { table, column } of COMMENT_PERSON_COLUMNS) {
    try {
      columnUpdates.push({ table, column, rows: await countEq(commentsDb, table, column, oldId) });
    } catch (e) {
      columnUpdates.push({ table, column, rows: 0 });
      if (!isMissingTable(e)) throw e;
    }
  }
  return columnUpdates;
}

async function updateUserInfoPk(commentsDb: SqlDb, own: UserInfoHit, oldId: string, email: string) {
  if (own.userId === oldId) {
    await query(commentsDb, `UPDATE userInfo SET userId=? WHERE userId=?`, [email, oldId]);
  }
}

async function applyPersonColumnUpdates(commentsDb: SqlDb, oldId: string, email: string) {
  for (const { table, column } of COMMENT_PERSON_COLUMNS) {
    try {
      await query(commentsDb, `UPDATE \`${table}\` SET ${column}=? WHERE TRIM(${column})=?`, [
        email,
        oldId,
      ]);
    } catch (e) {
      if (!isMissingTable(e)) throw e;
    }
  }
}

function replaceInstructorId(instructors: unknown, oldId: string, email: string): { next: unknown; changed: boolean } {
  let value = instructors;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return { next: instructors, changed: false };
    }
  }
  if (!Array.isArray(value)) return { next: instructors, changed: false };
  let changed = false;
  const next = value.map((item) => {
    if (typeof item === 'string' && item.trim() === oldId) {
      changed = true;
      return email;
    }
    if (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string') {
      const id = (item as { id: string }).id.trim();
      if (id === oldId) {
        changed = true;
        return { ...(item as object), id: email };
      }
    }
    return item;
  });
  return { next, changed };
}

async function countInstructorJsonRows(commentsDb: SqlDb, oldId: string): Promise<number> {
  const rows = await query<{ instructors: unknown }[]>(
    commentsDb,
    `SELECT instructors FROM courseMetadata WHERE instructors IS NOT NULL`
  );
  return (rows || []).filter((row) => replaceInstructorId(row.instructors, oldId, oldId).changed).length;
}

async function applyInstructorJsonUpdates(commentsDb: SqlDb, oldId: string, email: string) {
  const rows = await query<{ courseId: string; instanceId: string; instructors: unknown }[]>(
    commentsDb,
    `SELECT courseId, instanceId, instructors FROM courseMetadata WHERE instructors IS NOT NULL`
  );
  for (const row of rows || []) {
    const replaced = replaceInstructorId(row.instructors, oldId, email);
    if (!replaced.changed) continue;
    await query(
      commentsDb,
      `UPDATE courseMetadata SET instructors=? WHERE courseId=? AND instanceId=?`,
      [JSON.stringify(replaced.next), row.courseId, row.instanceId]
    );
  }
}

async function applyRewrite(params: {
  commentsDb: SqlDb;
  gradingDb: SqlDb;
  own: UserInfoHit;
  oldId: string;
  email: string;
}) {
  const { commentsDb, gradingDb, own, oldId, email } = params;
  await query(commentsDb, 'SET FOREIGN_KEY_CHECKS=0', []);
  await query(commentsDb, 'START TRANSACTION', []);
  try {
    await updateUserInfoPk(commentsDb, own, oldId, email);
    await applyPersonColumnUpdates(commentsDb, oldId, email);
    await applyInstructorJsonUpdates(commentsDb, oldId, email);
    await query(commentsDb, `UPDATE comments SET userEmail=? WHERE TRIM(userEmail)=?`, [email, oldId]);
    await query(gradingDb, `UPDATE grading SET userId=? WHERE TRIM(userId)=?`, [email, oldId]);
    await query(commentsDb, 'COMMIT', []);
  } catch (e) {
    try {
      await query(commentsDb, 'ROLLBACK', []);
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    await query(commentsDb, 'SET FOREIGN_KEY_CHECKS=1', []);
  }
}

export async function rewriteIdmIdToEmail(params: {
  commentsDb: SqlDb;
  gradingDb: SqlDb;
  oldId: string;
  email: string;
  dryRun: boolean;
}): Promise<RewriteOneResult> {
  const { commentsDb, gradingDb, oldId, email, dryRun } = params;
  const lookup = await loadUserInfoHits(commentsDb, oldId, email);
  if (lookup.skip) return lookup.skip;
  const own = lookup.own;
  if (!own) {
    return skipResult(
      {
        oldId,
        email,
        createdUserInfo: false,
        alreadyCanonical: false,
        columnUpdates: [],
        gradingRows: 0,
        instructorJsonRows: 0,
        commentsUserEmailRows: 0,
      },
      'no_userInfo_row',
      oldId
    );
  }

  const result: RewriteOneResult = {
    oldId,
    email,
    createdUserInfo: false,
    alreadyCanonical: own.userId === email && own.idmId === oldId,
    columnUpdates: await countPersonColumns(commentsDb, oldId),
    gradingRows: await countEq(gradingDb, 'grading', 'userId', oldId),
    instructorJsonRows: await countInstructorJsonRows(commentsDb, oldId),
    commentsUserEmailRows: await countEq(commentsDb, 'comments', 'userEmail', oldId),
  };

  if (!dryRun) {
    await applyRewrite({ commentsDb, gradingDb, own, oldId, email });
  }
  return result;
}
