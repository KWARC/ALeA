import { config as loadEnv } from 'dotenv';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import mysql from 'serverless-mysql';
import { rewriteIdmIdToEmail, type RewriteOneResult } from './idmUserIdRewrite';

type SqlDb = ReturnType<typeof mysql>;

type MappingRow = {
  userId: string;
  idmId: string;
  email: string;
};

type UnverifiedIdmEmailRow = {
  userId: string;
  idmId: string;
  email: string;
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

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function queryErrorResult(oldId: string, email: string, err: unknown): RewriteOneResult {
  return {
    oldId,
    email,
    skipped: 'query_error',
    skipDetail: err instanceof Error ? err.message : JSON.stringify(err),
    createdUserInfo: false,
    alreadyCanonical: false,
    columnUpdates: [],
    gradingRows: 0,
    instructorJsonRows: 0,
    commentsUserEmailRows: 0,
  };
}

function wouldTouchData(r: RewriteOneResult): boolean {
  if (r.skipped) return false;
  return (
    !r.alreadyCanonical ||
    r.gradingRows > 0 ||
    r.commentsUserEmailRows > 0 ||
    r.columnUpdates.some((c) => c.rows > 0)
  );
}

async function query<T>(db: SqlDb, sql: string, values: unknown[] = []): Promise<T> {
  const result = await db.query(sql, values);
  if (result && typeof result === 'object' && 'error' in (result as object)) {
    throw new Error(JSON.stringify((result as { error: unknown }).error));
  }
  return result as T;
}

async function loadVerifiedIdmEmailMapping(commentsDb: SqlDb): Promise<{
  mapping: Map<string, string>;
  duplicateEmails: { email: string; idmIds: string[] }[];
}> {
  const rows = await query<MappingRow[]>(
    commentsDb,
    `SELECT userId, idmId, email FROM userInfo
     WHERE idmId IS NOT NULL AND TRIM(idmId) <> ''
       AND email IS NOT NULL AND TRIM(email) <> ''
       AND isVerified = 1`
  );
  const byEmail = new Map<string, string[]>();
  const mapping = new Map<string, string>();
  for (const row of rows || []) {
    const idmId = String(row.idmId).trim();
    const email = String(row.email).trim().toLowerCase();
    if (!idmId || !email) continue;
    const ids = byEmail.get(email) ?? [];
    if (!ids.includes(idmId)) ids.push(idmId);
    byEmail.set(email, ids);
    mapping.set(idmId, email);
  }
  const duplicateEmails: { email: string; idmIds: string[] }[] = [];
  for (const [email, idmIds] of byEmail) {
    if (idmIds.length > 1) {
      duplicateEmails.push({ email, idmIds });
      for (const id of idmIds) mapping.delete(id);
    }
  }
  return { mapping, duplicateEmails };
}

/** IdM-keyed rows with an address that was never mail-verified. Password rows (`idmId` null) are not included. */
async function loadUnverifiedIdmEmails(commentsDb: SqlDb): Promise<UnverifiedIdmEmailRow[]> {
  const rows = await query<UnverifiedIdmEmailRow[]>(
    commentsDb,
    `SELECT userId, idmId, email FROM userInfo
     WHERE idmId IS NOT NULL AND TRIM(idmId) <> ''
       AND email IS NOT NULL AND TRIM(email) <> ''
       AND (isVerified IS NULL OR isVerified <> 1)`
  );
  return (rows || []).map((row) => ({
    userId: String(row.userId),
    idmId: String(row.idmId).trim(),
    email: String(row.email).trim().toLowerCase(),
  }));
}

async function clearUnverifiedIdmEmails(commentsDb: SqlDb): Promise<void> {
  await query(
    commentsDb,
    `UPDATE userInfo
     SET email = NULL, verificationToken = NULL, isVerified = 0
     WHERE idmId IS NOT NULL AND TRIM(idmId) <> ''
       AND email IS NOT NULL AND TRIM(email) <> ''
       AND (isVerified IS NULL OR isVerified <> 1)`
  );
}

async function runMappingRewrites(params: {
  mapping: Map<string, string>;
  commentsDb: SqlDb;
  gradingDb: SqlDb;
  dryRun: boolean;
}) {
  const { mapping, commentsDb, gradingDb, dryRun } = params;
  const results: RewriteOneResult[] = [];
  const skipped: RewriteOneResult[] = [];
  let processed = 0;
  for (const [oldId, email] of mapping) {
    processed++;
    try {
      const result = await rewriteIdmIdToEmail({
        commentsDb,
        gradingDb,
        oldId,
        email,
        dryRun,
      });
      if (result.skipped) skipped.push(result);
      else results.push(result);
    } catch (e) {
      skipped.push(queryErrorResult(oldId, email, e));
    }
    if (processed % 100 === 0) console.log(`  … ${processed} / ${mapping.size}`);
  }
  return { results, skipped };
}

/** Phase 6: re-key IdM `userId` → verified email from production `userInfo` (not CSVs). */
export async function rewriteIdmUsersFromMapping() {
  loadDotenv();
  const apply = process.env.REWRITE_IDM_APPLY === '1';
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

  const outDir = process.env.IDM_REWRITE_OUT_DIR || process.env.IDM_MAPPING_DIR || join(process.cwd(), 'student_data');
  const commentsDb = createDb(process.env.MYSQL_COMMENTS_DATABASE);
  const gradingDb = createDb(process.env.MYSQL_GRADING_DATABASE);

  console.log(
    apply ? 'REWRITE_IDM_APPLY=1 — writing changes' : 'Dry run — set REWRITE_IDM_APPLY=1 to apply'
  );
  console.log('Mapping source: production userInfo (idmId + verified email). Not CSVs.');

  try {
    const unverifiedIdmEmails = await loadUnverifiedIdmEmails(commentsDb);
    console.log(`Unverified emails on IdM rows (will clear, not rewrite): ${unverifiedIdmEmails.length}`);
    for (const row of unverifiedIdmEmails.slice(0, 30)) {
      console.log(`  clear ${row.idmId} userId=${row.userId} email=${row.email}`);
    }
    if (unverifiedIdmEmails.length > 30) {
      console.log(`  … ${unverifiedIdmEmails.length - 30} more unverified IdM emails`);
    }
    if (apply && unverifiedIdmEmails.length) {
      await clearUnverifiedIdmEmails(commentsDb);
      console.log('Cleared unverified email / verificationToken on those IdM rows.');
    }

    const { mapping, duplicateEmails } = await loadVerifiedIdmEmailMapping(commentsDb);
    console.log(`Verified idmId↔email pairs: ${mapping.size}`);
    const duplicateSkips: RewriteOneResult[] = duplicateEmails.flatMap((d) =>
      d.idmIds.map((oldId) => ({
        oldId,
        email: d.email,
        skipped: 'email_taken_by_other_account' as const,
        skipDetail: `duplicate_verified_email ${d.idmIds.join(',')}`,
        createdUserInfo: false,
        alreadyCanonical: false,
        columnUpdates: [],
        gradingRows: 0,
        instructorJsonRows: 0,
        commentsUserEmailRows: 0,
      }))
    );
    if (duplicateEmails.length) {
      console.log(`Duplicate verified emails (all those idmIds skipped): ${duplicateEmails.length}`);
      for (const d of duplicateEmails) {
        console.log(`  ${d.email} → ${d.idmIds.join(' | ')}`);
      }
    }

    const { results, skipped: rewriteSkipped } = await runMappingRewrites({
      mapping,
      commentsDb,
      gradingDb,
      dryRun: !apply,
    });
    const skipped = [...duplicateSkips, ...rewriteSkipped];

    const wouldTouch = results.filter(wouldTouchData);
    const lmsRows = results.filter((r) => !r.skipped);

    console.log(`\nRewritable: ${results.length}`);
    console.log(`Would touch data / userInfo PK: ${wouldTouch.length}`);
    console.log(`Skipped (collision or error): ${skipped.length}`);
    for (const s of skipped.slice(0, 30)) {
      console.log(`  skip ${s.oldId} → ${s.email} (${s.skipped}) ${s.skipDetail ?? ''}`);
    }
    if (skipped.length > 30) console.log(`  … ${skipped.length - 30} more skips`);
    console.log('\nACLMembership.memberUserId and courseMetadata.instructors JSON are included.');
    console.log('In-memory ACL is rebuilt when ALeA restarts. Matomo and interview files are not rewritten.');

    const lmsCsvPath = join(outDir, 'phase6-lms-idmid-email.csv');
    const lmsCsv =
      'idmId,email\n' + lmsRows.map((r) => `${csvCell(r.oldId)},${csvCell(r.email)}`).join('\n') + (lmsRows.length ? '\n' : '');
    await writeFile(lmsCsvPath, lmsCsv);
    console.log(`\nLMS mapping (rewritable only): ${lmsCsvPath} (${lmsRows.length} rows)`);

    const unverifiedCsvPath = join(outDir, 'phase6-unverified-idm-emails.csv');
    const unverifiedCsv =
      'idmId,userId,email\n' +
      unverifiedIdmEmails
        .map((r) => `${csvCell(r.idmId)},${csvCell(r.userId)},${csvCell(r.email)}`)
        .join('\n') +
      (unverifiedIdmEmails.length ? '\n' : '');
    await writeFile(unverifiedCsvPath, unverifiedCsv);
    console.log(`Unverified IdM emails (cleared on apply): ${unverifiedCsvPath} (${unverifiedIdmEmails.length} rows)`);

    const report = {
      generatedAt: new Date().toISOString(),
      apply,
      mappingSource: 'userInfo',
      mappingCount: mapping.size,
      unverifiedIdmEmailsCleared: unverifiedIdmEmails,
      duplicateEmails,
      rewritable: results.length,
      wouldTouch: wouldTouch.length,
      skipped,
      results: wouldTouch,
    };
    const reportPath = join(outDir, 'idm-userid-rewrite-report.json');
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`Wrote ${reportPath}`);
  } finally {
    await commentsDb.end();
    await gradingDb.end();
  }
}
