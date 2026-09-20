import type mysql from 'serverless-mysql';

export type SqlDb = ReturnType<typeof mysql>;

export const COMMENT_PERSON_COLUMNS: { table: string; column: string }[] = [
  { table: 'ACLMembership', column: 'memberUserId' },
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
];

export type RewriteSkipReason =
  | 'email_taken_by_other_account'
  | 'idm_id_bound_to_other_email'
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

type InstructorEdit = { courseId: string; instanceId: string; instructors: string };

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
     WHERE userId = ? OR userId = ? OR idmId = ? OR email = ?`,
    [oldId, email, oldId, email]
  );
  const own = (infoRows || []).find((r) => isOwnRow(r, oldId));
  const emailHolder = (infoRows || []).find(
    (r) => (r.userId === email || r.email === email) && !isOwnRow(r, oldId)
  );
  if (emailHolder) {
    return { skip: skipResult(base, 'email_taken_by_other_account', emailHolder.userId) };
  }
  if (own?.idmId && own.idmId !== oldId) {
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

function rewriteInstructorItem(item: unknown, oldId: string, email: string): { item: unknown; changed: boolean } {
  if (typeof item === 'string' && item === oldId) return { item: email, changed: true };
  if (item && typeof item === 'object' && (item as { id?: string }).id === oldId) {
    return { item: { ...item, id: email }, changed: true };
  }
  return { item, changed: false };
}

async function collectInstructorEdits(
  commentsDb: SqlDb,
  oldId: string,
  email: string
): Promise<InstructorEdit[]> {
  const instructorRows = await query<{ courseId: string; instanceId: string; instructors: unknown }[]>(
    commentsDb,
    `SELECT courseId, instanceId, instructors FROM courseMetadata
     WHERE instructors IS NOT NULL AND CAST(instructors AS CHAR) LIKE ?`,
    [`%${oldId}%`]
  );
  const instructorEdits: InstructorEdit[] = [];
  for (const row of instructorRows || []) {
    let value = row.instructors;
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        continue;
      }
    }
    if (!Array.isArray(value)) continue;
    let changed = false;
    const next = value.map((item) => {
      const rewritten = rewriteInstructorItem(item, oldId, email);
      if (rewritten.changed) changed = true;
      return rewritten.item;
    });
    if (changed) {
      instructorEdits.push({
        courseId: row.courseId,
        instanceId: row.instanceId,
        instructors: JSON.stringify(next),
      });
    }
  }
  return instructorEdits;
}

async function upsertUserInfo(
  commentsDb: SqlDb,
  own: UserInfoHit | undefined,
  oldId: string,
  email: string
) {
  if (!own) {
    await query(
      commentsDb,
      `INSERT INTO userInfo (userId, idmId, email, isVerified) VALUES (?, ?, ?, 1)`,
      [email, oldId, email]
    );
    return;
  }
  if (own.userId === oldId) {
    await query(
      commentsDb,
      `UPDATE userInfo SET userId=?, email=?, idmId=?, isVerified=1 WHERE userId=?`,
      [email, email, oldId, oldId]
    );
    return;
  }
  await query(
    commentsDb,
    `UPDATE userInfo SET email=?, idmId=?, isVerified=1 WHERE userId=?`,
    [email, oldId, email]
  );
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

async function applyRewrite(params: {
  commentsDb: SqlDb;
  gradingDb: SqlDb;
  own: UserInfoHit | undefined;
  oldId: string;
  email: string;
  instructorEdits: InstructorEdit[];
}) {
  const { commentsDb, gradingDb, own, oldId, email, instructorEdits } = params;
  await query(commentsDb, 'SET FOREIGN_KEY_CHECKS=0', []);
  await query(commentsDb, 'START TRANSACTION', []);
  try {
    await upsertUserInfo(commentsDb, own, oldId, email);
    await applyPersonColumnUpdates(commentsDb, oldId, email);
    await query(commentsDb, `UPDATE comments SET userEmail=? WHERE TRIM(userEmail)=?`, [email, oldId]);
    for (const edit of instructorEdits) {
      await query(
        commentsDb,
        `UPDATE courseMetadata SET instructors=? WHERE courseId=? AND instanceId=?`,
        [edit.instructors, edit.courseId, edit.instanceId]
      );
    }
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

  const instructorEdits = await collectInstructorEdits(commentsDb, oldId, email);
  const result: RewriteOneResult = {
    oldId,
    email,
    createdUserInfo: !own,
    alreadyCanonical: own?.userId === email && own?.idmId === oldId,
    columnUpdates: await countPersonColumns(commentsDb, oldId),
    gradingRows: await countEq(gradingDb, 'grading', 'userId', oldId),
    instructorJsonRows: instructorEdits.length,
    commentsUserEmailRows: await countEq(commentsDb, 'comments', 'userEmail', oldId),
  };

  if (!dryRun) {
    await applyRewrite({ commentsDb, gradingDb, own, oldId, email, instructorEdits });
  }
  return result;
}
