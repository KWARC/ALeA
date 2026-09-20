import { config as loadEnv } from 'dotenv';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import mysql from 'serverless-mysql';
import { loadIdmEmailMapping } from './checkIdmEmailMappingCoverage';

type SqlDb = ReturnType<typeof mysql>;

type FillSkipReason =
  | 'no_userInfo_row'
  | 'already_filled'
  | 'keep_fau_de_mismatch'
  | 'already_verified'
  | 'email_taken_by_other_account'
  | 'mapping_not_fau_de'
  | 'query_error';

type FillKind = 'empty' | 'overwrite_non_fau';

type FillOneResult = {
  oldId: string;
  email: string;
  userId?: string;
  existingEmail?: string;
  skipped?: FillSkipReason;
  skipDetail?: string;
  wouldFill: boolean;
  fillKind?: FillKind;
};

type UserInfoHit = {
  userId: string;
  idmId: string | null;
  email: string | null;
  isVerified: number | boolean | null;
};

type EmailMismatch = {
  oldId: string;
  userId: string;
  existingEmail: string;
  mappingEmail: string;
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

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return 'unserializable error';
  }
}

function isVerifiedFlag(value: number | boolean | null): boolean {
  return value === true || value === 1;
}

function normalizeStoredEmail(email: string | null): string {
  return (email ?? '').trim().toLowerCase();
}

function isFauDeEmail(email: string): boolean {
  return email.endsWith('@fau.de');
}

function isOwnRow(row: UserInfoHit, oldId: string): boolean {
  return row.userId === oldId || row.idmId === oldId;
}

async function query<T>(db: SqlDb, sql: string, values: unknown[] = []): Promise<T> {
  const result = await db.query(sql, values);
  if (result && typeof result === 'object' && 'error' in (result as object)) {
    throw new Error(JSON.stringify((result as { error: unknown }).error));
  }
  return result as T;
}

function skipResult(
  oldId: string,
  email: string,
  skipped: FillSkipReason,
  extra?: Partial<FillOneResult>
): FillOneResult {
  return { oldId, email, skipped, wouldFill: false, ...extra };
}

function findEmailHolder(infoRows: UserInfoHit[], oldId: string, email: string): UserInfoHit | undefined {
  return infoRows.find(
    (r) =>
      !isOwnRow(r, oldId) &&
      (normalizeStoredEmail(r.email) === email || r.userId.toLowerCase() === email)
  );
}

async function applyEmailUpdate(commentsDb: SqlDb, email: string, userId: string) {
  await query(
    commentsDb,
    `UPDATE userInfo SET email = ?
     WHERE userId = ? AND (isVerified IS NULL OR isVerified = 0)`,
    [email, userId]
  );
}

async function fillOneEmail(params: {
  commentsDb: SqlDb;
  oldId: string;
  email: string;
  dryRun: boolean;
}): Promise<FillOneResult> {
  const { commentsDb, oldId, email, dryRun } = params;
  if (!isFauDeEmail(email)) {
    return skipResult(oldId, email, 'mapping_not_fau_de');
  }

  const infoRows = await query<UserInfoHit[]>(
    commentsDb,
    `SELECT userId, idmId, email, isVerified FROM userInfo
     WHERE userId = ? OR idmId = ? OR LOWER(TRIM(email)) = ?`,
    [oldId, oldId, email]
  );

  const own = (infoRows || []).find((r) => isOwnRow(r, oldId));
  if (!own) return skipResult(oldId, email, 'no_userInfo_row');

  const existing = normalizeStoredEmail(own.email);
  if (existing === email) {
    return { oldId, email, userId: own.userId, existingEmail: existing, skipped: 'already_filled', wouldFill: false };
  }

  if (isVerifiedFlag(own.isVerified)) {
    return skipResult(oldId, email, 'already_verified', {
      userId: own.userId,
      existingEmail: existing || undefined,
      skipDetail: own.userId,
    });
  }

  const emailHolder = findEmailHolder(infoRows || [], oldId, email);
  if (emailHolder) {
    return skipResult(oldId, email, 'email_taken_by_other_account', {
      userId: own.userId,
      existingEmail: existing || undefined,
      skipDetail: emailHolder.userId,
    });
  }

  if (existing && isFauDeEmail(existing)) {
    return skipResult(oldId, email, 'keep_fau_de_mismatch', {
      userId: own.userId,
      existingEmail: existing,
      skipDetail: `${existing} vs ${email}`,
    });
  }

  const fillKind: FillKind = existing ? 'overwrite_non_fau' : 'empty';
  if (!dryRun) await applyEmailUpdate(commentsDb, email, own.userId);
  return {
    oldId,
    email,
    userId: own.userId,
    existingEmail: existing || undefined,
    wouldFill: true,
    fillKind,
  };
}

function printMismatchReport(filled: FillOneResult[], skipped: FillOneResult[]) {
  const fauDeMismatches: EmailMismatch[] = skipped
    .filter((s) => s.skipped === 'keep_fau_de_mismatch' && s.existingEmail && s.userId)
    .map((s) => ({
      oldId: s.oldId,
      userId: s.userId as string,
      existingEmail: s.existingEmail as string,
      mappingEmail: s.email,
    }))
    .sort((a, b) => a.existingEmail.localeCompare(b.existingEmail));

  const nonFauOverwrites = filled
    .filter((f) => f.fillKind === 'overwrite_non_fau')
    .map((f) => ({
      oldId: f.oldId,
      userId: f.userId,
      existingEmail: f.existingEmail,
      mappingEmail: f.email,
    }));

  const mismatchCount = fauDeMismatches.length + nonFauOverwrites.length;
  console.log(`\nMismatches (db email ≠ mapping): ${mismatchCount}`);
  console.log(`  originally @fau.de (kept, not overwritten): ${fauDeMismatches.length}`);
  for (const m of fauDeMismatches) {
    console.log(`    ${m.existingEmail}  (user ${m.userId} / ${m.oldId})  mapping ${m.mappingEmail}`);
  }
  console.log(`  non-@fau.de that will be overwritten: ${nonFauOverwrites.length}`);

  return { mismatchCount, fauDeMismatches, nonFauOverwrites };
}

export async function fillIdmEmailsFromMapping() {
  loadDotenv();
  const apply = process.env.FILL_IDM_EMAIL_APPLY === '1';
  const required = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_COMMENTS_DATABASE'];
  const missingEnv = required.filter((k) => !process.env[k]);
  if (missingEnv.length) {
    console.error(`Missing env: ${missingEnv.join(', ')}`);
    process.exit(1);
  }

  const mappingDir = process.env.IDM_MAPPING_DIR || join(process.cwd(), 'student_data');
  const mappingLoad = await loadIdmEmailMapping(mappingDir);
  const commentsDb = createDb(process.env.MYSQL_COMMENTS_DATABASE);

  console.log(
    apply ? 'FILL_IDM_EMAIL_APPLY=1 — writing emails' : 'Dry run — set FILL_IDM_EMAIL_APPLY=1 to apply'
  );
  console.log(`Mappings with a single email: ${mappingLoad.mapping.size}`);
  console.log(`Conflicting Login values skipped: ${mappingLoad.conflicts.length}`);
  for (const c of mappingLoad.conflicts) {
    console.log(`  conflict ${c.idmId} → ${c.emails.join(' | ')}`);
  }

  const filled: FillOneResult[] = [];
  const skipped: FillOneResult[] = [];
  let processed = 0;
  try {
    for (const [oldId, email] of mappingLoad.mapping) {
      processed++;
      try {
        const result = await fillOneEmail({
          commentsDb,
          oldId,
          email,
          dryRun: !apply,
        });
        if (result.wouldFill) filled.push(result);
        else skipped.push(result);
      } catch (e) {
        skipped.push(skipResult(oldId, email, 'query_error', { skipDetail: errorText(e) }));
      }
      if (processed % 100 === 0) console.log(`  … ${processed} / ${mappingLoad.mapping.size}`);
    }
  } finally {
    await commentsDb.end();
  }

  const skipCounts: Record<string, number> = {};
  for (const s of skipped) {
    const key = s.skipped ?? 'unknown';
    skipCounts[key] = (skipCounts[key] ?? 0) + 1;
  }

  const emptyFills = filled.filter((f) => f.fillKind === 'empty');
  console.log(`\nWould fill empty / filled empty: ${emptyFills.length}`);
  console.log(`Skipped: ${skipped.length}`);
  for (const [reason, n] of Object.entries(skipCounts).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${reason}: ${n}`);
  }

  const taken = skipped.filter((s) => s.skipped === 'email_taken_by_other_account');
  for (const s of taken.slice(0, 30)) {
    console.log(`  skip ${s.oldId} → ${s.email} (taken by ${s.skipDetail ?? ''})`);
  }
  if (taken.length > 30) console.log(`  … ${taken.length - 30} more taken by other account`);

  const notFau = skipped
    .filter((s) => s.skipped === 'mapping_not_fau_de')
    .slice()
    .sort((a, b) => a.email.localeCompare(b.email) || a.oldId.localeCompare(b.oldId));
  const notFauDomains = new Map<string, number>();
  for (const s of notFau) {
    const at = s.email.lastIndexOf('@');
    const domain = at >= 0 ? s.email.slice(at + 1) : '(none)';
    notFauDomains.set(domain, (notFauDomains.get(domain) ?? 0) + 1);
  }
  console.log(`\nMapping email not @fau.de (not written): ${notFau.length}`);
  for (const [domain, n] of [...notFauDomains.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    console.log(`  @${domain}: ${n}`);
  }
  for (const s of notFau) {
    console.log(`  ${s.oldId}  ${s.email}`);
  }
  const notFauListPath = join(mappingDir, 'idm-email-fill-not-fau.de.txt');
  await writeFile(
    notFauListPath,
    notFau.map((s) => `${s.oldId}\t${s.email}`).join('\n') + (notFau.length ? '\n' : '')
  );
  console.log(`Wrote ${notFauListPath}`);

  const mismatchReport = printMismatchReport(filled, skipped);

  const report = {
    generatedAt: new Date().toISOString(),
    apply,
    mappingCount: mappingLoad.mapping.size,
    conflicts: mappingLoad.conflicts,
    filledEmptyCount: emptyFills.length,
    skipCounts,
    mappingNotFauDeCount: notFau.length,
    mappingNotFauDeDomains: Object.fromEntries(
      [...notFauDomains.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    ),
    mappingNotFauDe: notFau.map((s) => ({ oldId: s.oldId, email: s.email })),
    ...mismatchReport,
    filled,
  };
  const reportPath = join(mappingDir, 'idm-email-fill-report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${reportPath}`);
}
