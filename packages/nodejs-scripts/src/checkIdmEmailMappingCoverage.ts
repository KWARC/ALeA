import { config as loadEnv } from 'dotenv';
import { parse } from 'fast-csv';
import { createReadStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import mysql from 'serverless-mysql';

/** Same rule as `isFauId` in `@alea/utils`. */
export function isIdmUserId(id: string | null | undefined): boolean {
  return !!id && id.length === 8 && !id.includes('@');
}

const IDM_SQL = (col: string) =>
  `${col} IS NOT NULL AND TRIM(${col}) <> '' AND CHAR_LENGTH(TRIM(${col})) = 8 AND TRIM(${col}) NOT LIKE '%@%'`;

type DbName = 'comments' | 'grading';

interface ColumnSource {
  db: DbName;
  table: string;
  column: string;
  kind: 'column';
}

interface JsonSource {
  db: DbName;
  table: string;
  column: string;
  kind: 'json-instructors';
}

type Source = ColumnSource | JsonSource;

const COMMENTS_COLUMN_SOURCES: ColumnSource[] = [
  { db: 'comments', table: 'userInfo', column: 'userId', kind: 'column' },
  { db: 'comments', table: 'ACLMembership', column: 'memberUserId', kind: 'column' },
  { db: 'comments', table: 'Answer', column: 'userId', kind: 'column' },
  { db: 'comments', table: 'Grading', column: 'checkerId', kind: 'column' },
  { db: 'comments', table: 'comments', column: 'userId', kind: 'column' },
  { db: 'comments', table: 'StudyBuddyUsers', column: 'userId', kind: 'column' },
  { db: 'comments', table: 'StudyBuddyConnections', column: 'senderId', kind: 'column' },
  { db: 'comments', table: 'StudyBuddyConnections', column: 'receiverId', kind: 'column' },
  { db: 'comments', table: 'announcement', column: 'instructorId', kind: 'column' },
  { db: 'comments', table: 'excused', column: 'userId', kind: 'column' },
  { db: 'comments', table: 'homework', column: 'updaterId', kind: 'column' },
  { db: 'comments', table: 'homeworkHistory', column: 'updaterId', kind: 'column' },
  { db: 'comments', table: 'courseMetadata', column: 'updaterId', kind: 'column' },
  { db: 'comments', table: 'semesterInfo', column: 'userId', kind: 'column' },
  { db: 'comments', table: 'notifications', column: 'userId', kind: 'column' },
  { db: 'comments', table: 'points', column: 'userId', kind: 'column' },
  { db: 'comments', table: 'points', column: 'granterId', kind: 'column' },
  { db: 'comments', table: 'updateHistory', column: 'ownerId', kind: 'column' },
  { db: 'comments', table: 'updateHistory', column: 'updaterId', kind: 'column' },
  { db: 'comments', table: 'CheatSheet', column: 'userId', kind: 'column' },
  { db: 'comments', table: 'CheatSheet', column: 'uploadedByUserId', kind: 'column' },
  { db: 'comments', table: 'CheatSheetHistory', column: 'uploadedByUserId', kind: 'column' },
  { db: 'comments', table: 'CourseMaterials', column: 'uploadedBy', kind: 'column' },
  { db: 'comments', table: 'BlogPosts', column: 'authorId', kind: 'column' },
  { db: 'comments', table: 'studentProfile', column: 'userId', kind: 'column' },
  { db: 'comments', table: 'recruiterProfile', column: 'userId', kind: 'column' },
  { db: 'comments', table: 'jobApplication', column: 'applicantId', kind: 'column' },
  { db: 'comments', table: 'jobApplicationAction', column: 'userId', kind: 'column' },
  { db: 'comments', table: 'jobPost', column: 'createdByUserId', kind: 'column' },
  { db: 'comments', table: 'orgInvitations', column: 'inviteruserId', kind: 'column' },
];

const COMMENTS_JSON_SOURCES: JsonSource[] = [
  { db: 'comments', table: 'courseMetadata', column: 'instructors', kind: 'json-instructors' },
];

const GRADING_COLUMN_SOURCES: ColumnSource[] = [
  { db: 'grading', table: 'grading', column: 'userId', kind: 'column' },
];

const ALL_SOURCES: Source[] = [
  ...COMMENTS_COLUMN_SOURCES,
  ...COMMENTS_JSON_SOURCES,
  ...GRADING_COLUMN_SOURCES,
];

interface IdCount {
  idmId: string;
  rowCount: number;
}

interface SourceResult {
  source: string;
  ok: boolean;
  error?: string;
  idmRowCount: number;
  distinctIdmIds: number;
  mappedRowCount: number;
  unmappedRowCount: number;
  unmappedDistinctIds: number;
  counts: IdCount[];
}

interface MappingIssue {
  idmId: string;
  emails: string[];
}

function workspaceRoot(): string {
  return process.cwd();
}

function loadDotenv() {
  loadEnv({ path: join(workspaceRoot(), 'packages/alea-frontend/.env.local') });
  loadEnv({ path: join(workspaceRoot(), 'packages/nodejs-scripts/.env.local') });
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

function sourceKey(s: Source): string {
  return `${s.db}.${s.table}.${s.column}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeHeader(header: string): string {
  return header.replace(/^\uFEFF/, '').trim();
}

async function parseMemberExportCsv(filePath: string): Promise<{ login: string; email: string }[]> {
  const rows: { login: string; email: string }[] = [];
  await new Promise<void>((resolve, reject) => {
    createReadStream(filePath)
      .pipe(parse({ headers: true, ignoreEmpty: true, trim: true }))
      .on('error', reject)
      .on('data', (row: Record<string, string>) => {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          mapped[normalizeHeader(k)] = v ?? '';
        }
        rows.push({
          login: (mapped['Login'] ?? '').trim(),
          email: (mapped['E-Mail'] ?? mapped['E-mail'] ?? mapped['Email'] ?? '').trim(),
        });
      })
      .on('end', () => resolve());
  });
  return rows;
}

export async function loadIdmEmailMapping(mappingDir: string): Promise<{
  files: string[];
  mapping: Map<string, string>;
  csvRowCount: number;
  skippedEmptyLogin: number;
  skippedEmptyEmail: number;
  conflicts: MappingIssue[];
}> {
  const names = (await readdir(mappingDir))
    .filter((n) => n.toLowerCase().endsWith('.csv'))
    .slice()
    .sort((a, b) => a.localeCompare(b));
  const emailSets = new Map<string, Set<string>>();
  let csvRowCount = 0;
  let skippedEmptyLogin = 0;
  let skippedEmptyEmail = 0;

  for (const name of names) {
    const rows = await parseMemberExportCsv(join(mappingDir, name));
    csvRowCount += rows.length;
    for (const row of rows) {
      if (!row.login) {
        skippedEmptyLogin++;
        continue;
      }
      if (!row.email) {
        skippedEmptyEmail++;
        continue;
      }
      if (!emailSets.has(row.login)) emailSets.set(row.login, new Set());
      emailSets.get(row.login)!.add(normalizeEmail(row.email));
    }
  }

  const mapping = new Map<string, string>();
  const conflicts: MappingIssue[] = [];
  for (const [idmId, emails] of emailSets) {
    const list = [...emails].sort((a, b) => a.localeCompare(b));
    if (list.length === 1) mapping.set(idmId, list[0]);
    else conflicts.push({ idmId, emails: list });
  }

  return {
    files: names,
    mapping,
    csvRowCount,
    skippedEmptyLogin,
    skippedEmptyEmail,
    conflicts,
  };
}

async function queryColumnCounts(db: ReturnType<typeof createDb>, source: ColumnSource): Promise<IdCount[]> {
  const sql = `SELECT TRIM(${source.column}) AS idmId, COUNT(*) AS rowCount
    FROM \`${source.table}\`
    WHERE ${IDM_SQL(source.column)}
    GROUP BY TRIM(${source.column})`;
  const rows = await db.query<{ idmId: string; rowCount: number | bigint }[]>(sql);
  if (!Array.isArray(rows)) {
    throw new TypeError(JSON.stringify(rows));
  }
  return rows.map((r) => ({ idmId: String(r.idmId), rowCount: Number(r.rowCount) }));
}

function extractInstructorIds(instructors: unknown): string[] {
  if (instructors == null) return [];
  let value = instructors;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return isIdmUserId(value) ? [value] : [];
    }
  }
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && isIdmUserId(item)) ids.push(item);
    else if (item && typeof item === 'object') {
      const id = (item as { id?: unknown }).id;
      if (typeof id === 'string' && isIdmUserId(id)) ids.push(id);
    }
  }
  return ids;
}

async function queryInstructorJsonCounts(
  db: ReturnType<typeof createDb>,
  source: JsonSource
): Promise<IdCount[]> {
  const sql = `SELECT ${source.column} AS instructors FROM \`${source.table}\` WHERE ${source.column} IS NOT NULL`;
  const rows = await db.query<{ instructors: unknown }[]>(sql);
  if (!Array.isArray(rows)) {
    throw new TypeError(JSON.stringify(rows));
  }
  const counts = new Map<string, number>();
  for (const row of rows) {
    const ids = extractInstructorIds(row.instructors);
    // One courseMetadata row can list several instructors; count each id once per row.
    for (const id of new Set(ids)) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }
  return [...counts.entries()].map(([idmId, rowCount]) => ({ idmId, rowCount }));
}

function toSourceResult(
  source: Source,
  counts: IdCount[],
  mapping: Map<string, string>,
  conflictIds: Set<string>
): SourceResult {
  let mappedRowCount = 0;
  let unmappedRowCount = 0;
  const unmappedIds = new Set<string>();
  for (const { idmId, rowCount } of counts) {
    const usable = mapping.has(idmId) && !conflictIds.has(idmId);
    if (usable) mappedRowCount += rowCount;
    else {
      unmappedRowCount += rowCount;
      unmappedIds.add(idmId);
    }
  }
  return {
    source: sourceKey(source),
    ok: true,
    idmRowCount: counts.reduce((s, c) => s + c.rowCount, 0),
    distinctIdmIds: counts.length,
    mappedRowCount,
    unmappedRowCount,
    unmappedDistinctIds: unmappedIds.size,
    counts,
  };
}

function mergeMissing(results: SourceResult[], mapping: Map<string, string>, conflictIds: Set<string>) {
  const byId = new Map<string, { totalRows: number; bySource: Record<string, number> }>();
  for (const result of results) {
    if (!result.ok) continue;
    for (const { idmId, rowCount } of result.counts) {
      if (mapping.has(idmId) && !conflictIds.has(idmId)) continue;
      if (!byId.has(idmId)) byId.set(idmId, { totalRows: 0, bySource: {} });
      const entry = byId.get(idmId)!;
      entry.totalRows += rowCount;
      entry.bySource[result.source] = (entry.bySource[result.source] || 0) + rowCount;
    }
  }
  return [...byId.entries()]
    .map(([idmId, data]) => ({ idmId, ...data }))
    .sort((a, b) => b.totalRows - a.totalRows || a.idmId.localeCompare(b.idmId));
}

export async function checkIdmEmailMappingCoverage() {
  loadDotenv();

  const required = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_COMMENTS_DATABASE', 'MYSQL_GRADING_DATABASE'];
  const missingEnv = required.filter((k) => !process.env[k]);
  if (missingEnv.length) {
    console.error(`Missing env: ${missingEnv.join(', ')}. Set them in packages/alea-frontend/.env.local`);
    process.exit(1);
  }

  const mappingDir = process.env.IDM_MAPPING_DIR || join(workspaceRoot(), 'student_data');
  const mappingLoad = await loadIdmEmailMapping(mappingDir);
  const conflictIds = new Set(mappingLoad.conflicts.map((c) => c.idmId));

  const commentsDb = createDb(process.env.MYSQL_COMMENTS_DATABASE);
  const gradingDb = createDb(process.env.MYSQL_GRADING_DATABASE);
  const dbFor = (name: DbName) => (name === 'comments' ? commentsDb : gradingDb);

  const sourceResults: SourceResult[] = [];
  try {
    for (const source of ALL_SOURCES) {
      try {
        const counts =
          source.kind === 'column'
            ? await queryColumnCounts(dbFor(source.db), source)
            : await queryInstructorJsonCounts(dbFor(source.db), source);
        sourceResults.push(toSourceResult(source, counts, mappingLoad.mapping, conflictIds));
      } catch (e) {
        sourceResults.push({
          source: sourceKey(source),
          ok: false,
          error: e instanceof Error ? e.message : String(e),
          idmRowCount: 0,
          distinctIdmIds: 0,
          mappedRowCount: 0,
          unmappedRowCount: 0,
          unmappedDistinctIds: 0,
          counts: [],
        });
      }
    }
  } finally {
    await commentsDb.end();
    await gradingDb.end();
  }

  const allDbIds = new Set<string>();
  for (const result of sourceResults) {
    for (const c of result.counts) allDbIds.add(c.idmId);
  }

  let mappedDistinctInDb = 0;
  let missingDistinctInDb = 0;
  let conflictDistinctInDb = 0;
  for (const id of allDbIds) {
    if (conflictIds.has(id)) conflictDistinctInDb++;
    else if (mappingLoad.mapping.has(id)) mappedDistinctInDb++;
    else missingDistinctInDb++;
  }

  const missing = mergeMissing(sourceResults, mappingLoad.mapping, conflictIds);
  const unmappedRowTotal = sourceResults.reduce((s, r) => s + r.unmappedRowCount, 0);
  const mappedRowTotal = sourceResults.reduce((s, r) => s + r.mappedRowCount, 0);
  const idmRowTotal = sourceResults.reduce((s, r) => s + r.idmRowCount, 0);

  const enough = missingDistinctInDb === 0 && conflictDistinctInDb === 0 && mappingLoad.conflicts.length === 0;

  const report = {
    generatedAt: new Date().toISOString(),
    enough,
    mapping: {
      directory: mappingDir,
      files: mappingLoad.files,
      csvRowCount: mappingLoad.csvRowCount,
      uniqueIdmIdsWithSingleEmail: mappingLoad.mapping.size,
      skippedEmptyLogin: mappingLoad.skippedEmptyLogin,
      skippedEmptyEmail: mappingLoad.skippedEmptyEmail,
      conflictingIdmIds: mappingLoad.conflicts,
    },
    databases: {
      distinctIdmIds: allDbIds.size,
      distinctIdmIdsWithUsableMapping: mappedDistinctInDb,
      distinctIdmIdsMissingFromMapping: missingDistinctInDb,
      distinctIdmIdsWithConflictingMapping: conflictDistinctInDb,
      idmShapedRowOccurrences: idmRowTotal,
      rowOccurrencesWithUsableMapping: mappedRowTotal,
      rowOccurrencesNotMigratable: unmappedRowTotal,
    },
    perSource: sourceResults.map(({ counts: _counts, ...rest }) => rest),
    missingIdmIds: missing,
  };

  const lines: string[] = [];
  const p = (line = '') => lines.push(line);

  p('IdM id → email mapping coverage');
  p('================================');
  p(`Enough to migrate every IdM-shaped DB value: ${enough ? 'YES' : 'NO'}`);
  p();
  p('Mapping files');
  p(`  dir: ${mappingDir}`);
  p(`  files (${mappingLoad.files.length}): ${mappingLoad.files.join(', ') || '(none)'}`);
  p(`  CSV rows: ${mappingLoad.csvRowCount}`);
  p(`  unique Login values with exactly one email: ${mappingLoad.mapping.size}`);
  p(`  rows skipped (empty Login): ${mappingLoad.skippedEmptyLogin}`);
  p(`  rows skipped (empty E-Mail): ${mappingLoad.skippedEmptyEmail}`);
  p(`  Login values with conflicting emails: ${mappingLoad.conflicts.length}`);
  for (const c of mappingLoad.conflicts) {
    p(`    ${c.idmId} → ${c.emails.join(' | ')}`);
  }
  p();
  p('IdM-shaped ids in comments + grading DBs');
  p('  (CHAR_LENGTH=8 and no "@", same rule as isFauId)');
  p(`  distinct IdM ids: ${allDbIds.size}`);
  p(`  with a usable mapping: ${mappedDistinctInDb}`);
  p(`  missing from mapping: ${missingDistinctInDb}`);
  p(`  present but mapping conflict: ${conflictDistinctInDb}`);
  p(`  IdM-shaped cell occurrences (sum across columns): ${idmRowTotal}`);
  p(`    migratable with mapping: ${mappedRowTotal}`);
  p(`    will not be migrated: ${unmappedRowTotal}`);
  p();
  p('Per-source aggregate (rows that will not be migrated)');
  const failed = sourceResults.filter((r) => !r.ok);
  const withUnmapped = sourceResults.filter((r) => r.ok && r.unmappedRowCount > 0);
  const clean = sourceResults.filter((r) => r.ok && r.unmappedRowCount === 0 && r.idmRowCount > 0);
  const empty = sourceResults.filter((r) => r.ok && r.idmRowCount === 0);
  for (const r of withUnmapped.sort((a, b) => b.unmappedRowCount - a.unmappedRowCount)) {
    p(
      `  ${r.source}: ${r.unmappedRowCount} / ${r.idmRowCount} IdM rows unmapped (${r.unmappedDistinctIds} distinct ids)`
    );
  }
  if (!withUnmapped.length) p('  (none)');
  p();
  p('Sources with IdM rows fully covered by mapping');
  for (const r of clean) p(`  ${r.source}: ${r.idmRowCount} rows, ${r.distinctIdmIds} ids`);
  if (!clean.length) p('  (none)');
  p();
  p(`Sources with no IdM-shaped values: ${empty.length}`);
  if (failed.length) {
    p();
    p('Sources that failed to query (table/column may not exist)');
    for (const r of failed) p(`  ${r.source}: ${r.error}`);
  }
  p();
  p(`Missing / unusable IdM ids (${missing.length}), sorted by affected row count`);
  const preview = missing.slice(0, 50);
  for (const m of preview) {
    const sources = Object.entries(m.bySource)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    p(`  ${m.idmId}  rows=${m.totalRows}  ${sources}`);
  }
  if (missing.length > preview.length) p(`  … ${missing.length - preview.length} more (see JSON report)`);

  const text = lines.join('\n');
  console.log(text);

  const jsonPath = join(mappingDir, 'idm-mapping-coverage-report.json');
  const txtPath = join(mappingDir, 'idm-mapping-coverage-report.txt');
  await writeFile(jsonPath, JSON.stringify(report, null, 2));
  await writeFile(txtPath, text + '\n');
  console.log(`\nWrote ${txtPath}`);
  console.log(`Wrote ${jsonPath}`);
}
