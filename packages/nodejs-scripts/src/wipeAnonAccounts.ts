import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import mysql from 'serverless-mysql';

/** Same prefix as `ANON_USER_ID_PREFIX` in `@alea/spec`. */
const ANON_PREFIX = '_anon_';

type DbName = 'comments' | 'grading';

interface PersonColumn {
  db: DbName;
  table: string;
  column: string;
}

/** Person-keyed columns that may hold `_anon_…` ids. Delete children before `userInfo`. */
const PERSON_COLUMNS: PersonColumn[] = [
  { db: 'comments', table: 'jobApplicationAction', column: 'userId' },
  { db: 'comments', table: 'jobApplication', column: 'applicantId' },
  { db: 'comments', table: 'recruiterProfile', column: 'userId' },
  { db: 'comments', table: 'studentProfile', column: 'userId' },
  { db: 'comments', table: 'jobPost', column: 'createdByUserId' },
  { db: 'comments', table: 'orgInvitations', column: 'inviteruserId' },
  { db: 'comments', table: 'ACLMembership', column: 'memberUserId' },
  { db: 'comments', table: 'Answer', column: 'userId' },
  { db: 'comments', table: 'Grading', column: 'checkerId' },
  { db: 'comments', table: 'comments', column: 'userId' },
  { db: 'comments', table: 'StudyBuddyUsers', column: 'userId' },
  { db: 'comments', table: 'StudyBuddyConnections', column: 'senderId' },
  { db: 'comments', table: 'StudyBuddyConnections', column: 'receiverId' },
  { db: 'comments', table: 'announcement', column: 'instructorId' },
  { db: 'comments', table: 'excused', column: 'userId' },
  { db: 'comments', table: 'homework', column: 'updaterId' },
  { db: 'comments', table: 'homeworkHistory', column: 'updaterId' },
  { db: 'comments', table: 'courseMetadata', column: 'updaterId' },
  { db: 'comments', table: 'semesterInfo', column: 'userId' },
  { db: 'comments', table: 'notifications', column: 'userId' },
  { db: 'comments', table: 'points', column: 'userId' },
  { db: 'comments', table: 'points', column: 'granterId' },
  { db: 'comments', table: 'updateHistory', column: 'ownerId' },
  { db: 'comments', table: 'updateHistory', column: 'updaterId' },
  { db: 'comments', table: 'CheatSheet', column: 'userId' },
  { db: 'comments', table: 'CheatSheet', column: 'uploadedByUserId' },
  { db: 'comments', table: 'CheatSheetHistory', column: 'uploadedByUserId' },
  { db: 'comments', table: 'CourseMaterials', column: 'uploadedBy' },
  { db: 'comments', table: 'BlogPosts', column: 'authorId' },
  { db: 'comments', table: 'userInfo', column: 'userId' },
  { db: 'grading', table: 'grading', column: 'userId' },
];

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

/** `_` is a LIKE wildcard; match the prefix with LEFT() instead. */
function anonPredicate(column: string): string {
  return `LEFT(TRIM(${column}), ${ANON_PREFIX.length}) = ?`;
}

export async function wipeAnonAccounts() {
  loadDotenv();
  const apply = process.env.WIPE_ANON_APPLY === '1';
  const required = [
    'MYSQL_HOST',
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'MYSQL_COMMENTS_DATABASE',
    'MYSQL_GRADING_DATABASE',
  ];
  const missingEnv = required.filter((k) => !process.env[k]);
  if (missingEnv.length) {
    console.error(`Missing env: ${missingEnv.join(', ')}`);
    process.exit(1);
  }

  const commentsDb = createDb(process.env.MYSQL_COMMENTS_DATABASE);
  const gradingDb = createDb(process.env.MYSQL_GRADING_DATABASE);
  const dbFor = (name: DbName) => (name === 'comments' ? commentsDb : gradingDb);

  console.log(apply ? 'WIPE_ANON_APPLY=1 — deleting rows' : 'Dry run — set WIPE_ANON_APPLY=1 to delete');
  console.log(`Prefix: ${ANON_PREFIX}\n`);

  try {
    for (const source of PERSON_COLUMNS) {
      const label = `${source.db}.${source.table}.${source.column}`;
      const where = anonPredicate(source.column);
      try {
        const countRows = await dbFor(source.db).query<{ n: number | bigint }[]>(
          `SELECT COUNT(*) AS n FROM \`${source.table}\` WHERE ${where}`,
          [ANON_PREFIX]
        );
        if (!Array.isArray(countRows)) {
          console.error(`  ${label}: count failed ${JSON.stringify(countRows)}`);
          continue;
        }
        const n = Number(countRows[0]?.n ?? 0);
        if (!apply) {
          console.log(`  ${label}: ${n} row(s)`);
          continue;
        }
        if (n === 0) {
          console.log(`  ${label}: 0 (skip)`);
          continue;
        }
        const result = await dbFor(source.db).query(
          `DELETE FROM \`${source.table}\` WHERE ${where}`,
          [ANON_PREFIX]
        );
        const affected =
          result && typeof result === 'object' && 'affectedRows' in result
            ? Number((result as { affectedRows: number }).affectedRows)
            : n;
        console.log(`  ${label}: deleted ${affected}`);
      } catch (e) {
        console.error(`  ${label}: ${e instanceof Error ? e.message : e}`);
      }
    }
  } finally {
    await commentsDb.end();
    await gradingDb.end();
  }
}
