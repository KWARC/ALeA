import { config as loadEnv } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { join } from 'node:path';
import mysql from 'serverless-mysql';
import {
  getResourceId,
  INSTRUCTOR_RESOURCE_AND_ACTION,
} from '@alea/utils';
import {
  buildCheatsheetRosterPdf,
  concatPdfBuffers,
  CheatsheetPrintPackManifest,
  CheatsheetPrintPackStudent,
  getPrintPackDir,
  mergeCheatsheets,
  PRINT_PACK_COMBINED_FILE,
  PRINT_PACK_MANIFEST_FILE,
  PRINT_PACK_ROSTER_FILE,
  PRINT_PACK_STUDENTS_DIR,
  resetPrintPackDir,
  resolveSafeCheatsheetPath,
  safeStudentPdfName,
} from '@alea/node-utils';

type SqlDb = ReturnType<typeof mysql>;

type AclMembershipRow = {
  parentACLId: string;
  memberACLId: string | null;
  memberUserId: string | null;
};

type CheatSheetRow = {
  userId: string;
  studentName: string | null;
  fileName: string | null;
  weekId: string;
  createdAt: string;
};

type UserInfoRow = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
};

function loadDotenv() {
  loadEnv({ path: join(process.cwd(), 'packages/alea-frontend/.env.local') });
  loadEnv({ path: join(process.cwd(), 'packages/nodejs-scripts/.env.local') });
}

function createDb(database: string | undefined) {
  return mysql({
    config: {
      host: process.env.MYSQL_HOST,
      port: +(process.env.MYSQL_PORT || 3306),
      database,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
    },
  });
}

const EXAM_CODES: Record<string, string> = {
  'FAU|ai-2|SS26': '013',
};

function examCodeFor(universityId: string, courseId: string, instanceId: string) {
  const key = `${universityId}|${courseId}|${instanceId}`;
  const code = EXAM_CODES[key];
  if (!code) {
    throw new Error(`No exam code mapped for ${key}. Add it to EXAM_CODES in generateCheatsheetPrintPack.ts`);
  }
  return code;
}

function enrollmentAclId(courseId: string, instanceId: string) {
  return `${courseId}-${instanceId}-enrollments`;
}

function flattenAclMembers(
  aclId: string,
  memberships: AclMembershipRow[],
  seen = new Set<string>()
): string[] {
  if (seen.has(aclId)) return [];
  seen.add(aclId);
  const members = new Set<string>();
  for (const row of memberships.filter((m) => m.parentACLId === aclId)) {
    if (row.memberUserId) {
      members.add(row.memberUserId);
    } else if (row.memberACLId) {
      for (const child of flattenAclMembers(row.memberACLId, memberships, seen)) {
        members.add(child);
      }
    }
  }
  return Array.from(members);
}

async function loadEnrolledStudentIds(
  db: SqlDb,
  courseId: string,
  instanceId: string
): Promise<string[]> {
  const memberships = await db.query<AclMembershipRow[]>(
    'SELECT parentACLId, memberACLId, memberUserId FROM ACLMembership'
  );
  const enrolled = flattenAclMembers(enrollmentAclId(courseId, instanceId), memberships);
  const instructorIds = new Set<string>();
  for (const { resource, action } of INSTRUCTOR_RESOURCE_AND_ACTION) {
    const resourceId = getResourceId(resource, { courseId, instanceId });
    const access = await db.query<{ aclId: string }[]>(
      'SELECT aclId FROM ResourceAccess WHERE resourceId=? AND actionId=? LIMIT 1',
      [resourceId, action]
    );
    const aclId = access[0]?.aclId;
    if (!aclId) continue;
    for (const id of flattenAclMembers(aclId, memberships)) {
      instructorIds.add(id);
    }
  }
  return enrolled.filter((id) => !instructorIds.has(id));
}

function groupRowsByUser(cheatRows: CheatSheetRow[]) {
  const byUser = new Map<string, CheatSheetRow[]>();
  for (const row of cheatRows) {
    const list = byUser.get(row.userId) ?? [];
    list.push(row);
    byUser.set(row.userId, list);
  }
  return byUser;
}

async function mergeStudentPdf(params: {
  userId: string;
  rows: CheatSheetRow[];
  baseDir: string;
  courseName: string;
  courseId: string;
  instanceId: string;
  universityId: string;
  examCode: string;
  userInfo: Map<string, UserInfoRow>;
}): Promise<{ student: CheatsheetPrintPackStudent; buffer: Buffer } | { skipped: { userId: string; reason: string } }> {
  const validPaths: string[] = [];
  const weekIds: string[] = [];
  for (const row of params.rows) {
    if (!row.fileName) continue;
    const filePath = resolveSafeCheatsheetPath(params.baseDir, row.fileName);
    if (!filePath || !fs.existsSync(filePath)) continue;
    validPaths.push(filePath);
    weekIds.push(row.weekId);
  }
  if (validPaths.length === 0) {
    return { skipped: { userId: params.userId, reason: 'No cheat sheet files found on disk' } };
  }
  const lastRow = params.rows.at(-1);
  if (!lastRow) {
    return { skipped: { userId: params.userId, reason: 'No cheat sheet rows' } };
  }
  const studentName = displayName(params.userId, params.userInfo, params.rows[0]?.studentName);
  const buffer = await mergeCheatsheets(
    {
      courseName: params.courseName,
      courseId: params.courseId,
      instanceId: params.instanceId,
      universityId: params.universityId,
      studentName,
      studentId: params.userId,
      createdAt: String(params.rows[0]?.createdAt ?? ''),
      weekId: lastRow.weekId,
    },
    '',
    validPaths.map((p) => fs.readFileSync(p)),
    { examCode: params.examCode }
  );
  return {
    student: {
      userId: params.userId,
      studentName,
      weekIds,
      fileName: safeStudentPdfName(params.userId),
    },
    buffer,
  };
}

function displayName(
  userId: string,
  userInfo: Map<string, UserInfoRow>,
  cheatSheetName?: string | null
) {
  const info = userInfo.get(userId);
  const fromProfile = [info?.firstName, info?.lastName].filter(Boolean).join(' ').trim();
  if (fromProfile) return fromProfile;
  if (cheatSheetName?.trim()) return cheatSheetName.trim();
  return userId;
}

export async function generateCheatsheetPrintPack() {
  loadDotenv();
  const universityId = process.env.UNIVERSITY_ID;
  const courseId = process.env.COURSE_ID;
  const instanceId = process.env.INSTANCE_ID;
  const courseName = process.env.COURSE_NAME || courseId || '';
  const commentsDbName = process.env.MYSQL_COMMENTS_DATABASE;

  if (!universityId || !courseId || !instanceId) {
    console.error('Set UNIVERSITY_ID, COURSE_ID, and INSTANCE_ID');
    process.exit(1);
  }
  if (!process.env.CHEATSHEETS_DIR) {
    console.error('CHEATSHEETS_DIR is not configured');
    process.exit(1);
  }
  const cheatsheetsDir = path.resolve(process.env.CHEATSHEETS_DIR);
  if (!commentsDbName) {
    console.error('MYSQL_COMMENTS_DATABASE is not set');
    process.exit(1);
  }
  const examCode = examCodeFor(universityId, courseId, instanceId);

  const db = createDb(commentsDbName);
  try {
    const enrolledStudents = await loadEnrolledStudentIds(db, courseId, instanceId);
    const enrolledSet = new Set(enrolledStudents);

    const cheatRows = await db.query<CheatSheetRow[]>(
      `SELECT userId, studentName, fileName, weekId, createdAt
       FROM CheatSheet
       WHERE courseId=? AND instanceId=? AND universityId=? AND uploadedAt IS NOT NULL
       ORDER BY weekId ASC`,
      [courseId, instanceId, universityId]
    );
    const byUser = groupRowsByUser(cheatRows);

    const allUserIds = new Set([...enrolledStudents, ...byUser.keys()]);
    const userInfoRows =
      allUserIds.size === 0
        ? []
        : await db.query<UserInfoRow[]>(
            `SELECT userId, firstName, lastName FROM userInfo WHERE userId IN (?)`,
            [Array.from(allUserIds)]
          );
    const userInfo = new Map(userInfoRows.map((u) => [u.userId, u]));

    const uploadedRows = [];
    const noUploadRows = [];
    for (const userId of enrolledStudents) {
      const name = displayName(userId, userInfo, byUser.get(userId)?.[0]?.studentName);
      const count = byUser.get(userId)?.length ?? 0;
      if (count > 0) {
        uploadedRows.push({ name, userId, uploadCount: count });
      } else {
        noUploadRows.push({ name, userId });
      }
    }
    for (const [userId, rows] of byUser) {
      if (enrolledSet.has(userId)) continue;
      uploadedRows.push({
        name: displayName(userId, userInfo, rows[0]?.studentName),
        userId,
        uploadCount: rows.length,
      });
    }

    const packDir = getPrintPackDir(cheatsheetsDir, universityId, courseId, instanceId);
    resetPrintPackDir(packDir);
    const baseDir = path.resolve(cheatsheetsDir);
    const skipped: { userId: string; reason: string }[] = [];
    const students: CheatsheetPrintPackStudent[] = [];
    const mergedBuffers: Buffer[] = [];

    const mergeTargets = [...byUser.entries()].sort(([a], [b]) => {
      const nameA = displayName(a, userInfo, byUser.get(a)?.[0]?.studentName);
      const nameB = displayName(b, userInfo, byUser.get(b)?.[0]?.studentName);
      const cmp = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
      return cmp !== 0 ? cmp : a.localeCompare(b);
    });

    for (const [userId, rows] of mergeTargets) {
      const result = await mergeStudentPdf({
        userId,
        rows,
        baseDir,
        courseName,
        courseId,
        instanceId,
        universityId,
        examCode,
        userInfo,
      });
      if ('skipped' in result) {
        skipped.push(result.skipped);
        continue;
      }
      fs.writeFileSync(
        path.join(packDir, PRINT_PACK_STUDENTS_DIR, result.student.fileName),
        result.buffer
      );
      mergedBuffers.push(result.buffer);
      students.push(result.student);
      console.log(`Merged ${userId} (${result.student.weekIds.length} weeks)`);
    }

    if (mergedBuffers.length > 0) {
      const combined = await concatPdfBuffers(mergedBuffers);
      fs.writeFileSync(path.join(packDir, PRINT_PACK_COMBINED_FILE), combined);
    } else {
      console.warn('No merged student PDFs; combined.pdf was not written');
    }

    const roster = await buildCheatsheetRosterPdf({
      courseName,
      courseId,
      instanceId,
      universityId,
      uploaded: uploadedRows,
      noUploads: noUploadRows,
    });
    fs.writeFileSync(path.join(packDir, PRINT_PACK_ROSTER_FILE), roster);

    const manifest: CheatsheetPrintPackManifest = {
      generatedAt: new Date().toISOString(),
      universityId,
      courseId,
      instanceId,
      courseName,
      uploadedCount: uploadedRows.length,
      noUploadCount: noUploadRows.length,
      mergedCount: students.length,
      skipped,
      students,
    };
    fs.writeFileSync(path.join(packDir, PRINT_PACK_MANIFEST_FILE), JSON.stringify(manifest, null, 2));
    console.log(`Print pack written to ${packDir}`);
  } finally {
    await db.end();
  }
}
