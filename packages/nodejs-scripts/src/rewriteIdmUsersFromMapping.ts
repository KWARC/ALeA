import { config as loadEnv } from 'dotenv';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import mysql from 'serverless-mysql';
import { loadIdmEmailMapping } from './checkIdmEmailMappingCoverage';
import { rewriteIdmIdToEmail, type RewriteOneResult } from './idmUserIdRewrite';

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
  return (
    r.createdUserInfo ||
    !r.alreadyCanonical ||
    r.gradingRows > 0 ||
    r.instructorJsonRows > 0 ||
    r.commentsUserEmailRows > 0 ||
    r.columnUpdates.some((c) => c.rows > 0)
  );
}

async function runMappingRewrites(params: {
  mapping: Map<string, string>;
  commentsDb: ReturnType<typeof mysql>;
  gradingDb: ReturnType<typeof mysql>;
  dryRun: boolean;
}) {
  const { mapping, commentsDb, gradingDb, dryRun } = params;
  const results: RewriteOneResult[] = [];
  const skipped: RewriteOneResult[] = [];
  let processed = 0;
  try {
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
  } finally {
    await commentsDb.end();
    await gradingDb.end();
  }
  return { results, skipped };
}

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

  const mappingDir = process.env.IDM_MAPPING_DIR || join(process.cwd(), 'student_data');
  const mappingLoad = await loadIdmEmailMapping(mappingDir);
  const commentsDb = createDb(process.env.MYSQL_COMMENTS_DATABASE);
  const gradingDb = createDb(process.env.MYSQL_GRADING_DATABASE);

  console.log(apply ? 'REWRITE_IDM_APPLY=1 — writing changes' : 'Dry run — set REWRITE_IDM_APPLY=1 to apply');
  console.log(`Mappings with a single email: ${mappingLoad.mapping.size}`);
  console.log(`Conflicting Login values skipped: ${mappingLoad.conflicts.length}`);
  for (const c of mappingLoad.conflicts) {
    console.log(`  conflict ${c.idmId} → ${c.emails.join(' | ')}`);
  }

  const { results, skipped } = await runMappingRewrites({
    mapping: mappingLoad.mapping,
    commentsDb,
    gradingDb,
    dryRun: !apply,
  });

  const wouldTouch = results.filter(wouldTouchData);

  console.log(`\nRewritable mappings: ${results.length}`);
  console.log(`Would touch data / userInfo: ${wouldTouch.length}`);
  console.log(`Skipped (collision or error): ${skipped.length}`);
  for (const s of skipped.slice(0, 30)) {
    console.log(`  skip ${s.oldId} → ${s.email} (${s.skipped}) ${s.skipDetail ?? ''}`);
  }
  if (skipped.length > 30) console.log(`  … ${skipped.length - 30} more skips`);
  console.log('\nACL cache: recompute memberships (access-control/recompute-memberships) after apply.');

  const report = {
    generatedAt: new Date().toISOString(),
    apply,
    mappingCount: mappingLoad.mapping.size,
    conflicts: mappingLoad.conflicts,
    rewritable: results.length,
    wouldTouch: wouldTouch.length,
    skipped,
    results: wouldTouch,
  };
  const reportPath = join(mappingDir, 'idm-userid-rewrite-report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${reportPath}`);
}
