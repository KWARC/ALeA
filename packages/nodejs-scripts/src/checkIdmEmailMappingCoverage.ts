import { config as loadEnv } from 'dotenv';
import { parse } from 'fast-csv';
import { createReadStream } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import mysql from 'serverless-mysql';

/** Same rule as `isFauId` in `@alea/utils`. */
export function isIdmUserId(id: string | null | undefined): boolean {
  return !!id && id.length === 8 && !id.includes('@');
}

const IDM_SQL = (col: string) =>
  `${col} IS NOT NULL AND TRIM(${col}) <> '' AND CHAR_LENGTH(TRIM(${col})) = 8 AND TRIM(${col}) NOT LIKE '%@%'`;

const ADDITIONAL_MAPPING_FILE = 'additional_mappings.csv';
const USERINFO_SOURCE_KEY = 'comments.userInfo.userId';
const OMIT_FROM_MISSING_SOURCES = new Set([USERINFO_SOURCE_KEY]);

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

const OBVIOUS_ID_COLUMNS = new Set([
  'userId',
  'uploadedBy',
  'uploadedByUserId',
  'createdByUserId',
  'applicantId',
  'authorId',
  'inviteruserId',
]);

interface IdCount {
  idmId: string;
  rowCount: number;
}

interface SourceResult {
  source: string;
  label: string;
  ok: boolean;
  error?: string;
  idmRowCount: number;
  distinctIdmIds: number;
  mappedRowCount: number;
  unmappedRowCount: number;
  unmappedDistinctIds: number;
  exampleUnmappedIds: string[];
  counts: IdCount[];
}

interface MappingIssue {
  idmId: string;
  emails: string[];
}

interface GradingCourseTermSlice {
  courseId: string;
  instanceId: string;
  idmRowCount: number;
  distinctIdmIds: number;
  mappedRowCount: number;
  unmappedRowCount: number;
  unmappedDistinctIds: number;
  exampleUnmappedIds: string[];
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

/** Short label for humans: drop db prefix and obvious userId column names. */
export function displaySourceLabel(key: string): string {
  const [db, table, ...rest] = key.split('.');
  const column = rest.join('.');
  if (db === 'grading') return 'grading';
  if (!column || OBVIOUS_ID_COLUMNS.has(column) || column === 'instructors') return table;
  return `${table}.${column}`;
}

function pct(part: number, total: number): string {
  if (!total) return 'n/a';
  return `${((100 * part) / total).toFixed(1)}%`;
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

/** `email idmId` (whitespace or comma), one pair per line. */
export function parseAdditionalMappingText(text: string): { login: string; email: string }[] {
  const rows: { login: string; email: string }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/[\s,;]+/).filter(Boolean);
    if (parts.length < 2) continue;
    if (parts[0].includes('@')) rows.push({ email: parts[0], login: parts[1] });
    else if (parts[1].includes('@')) rows.push({ login: parts[0], email: parts[1] });
  }
  return rows;
}

function addMappingRow(
  emailSets: Map<string, Set<string>>,
  row: { login: string; email: string },
  counters: { csvRowCount: number; skippedEmptyLogin: number; skippedEmptyEmail: number }
) {
  counters.csvRowCount++;
  if (!row.login) {
    counters.skippedEmptyLogin++;
    return;
  }
  if (!row.email) {
    counters.skippedEmptyEmail++;
    return;
  }
  if (!emailSets.has(row.login)) emailSets.set(row.login, new Set());
  emailSets.get(row.login)!.add(normalizeEmail(row.email));
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
  const counters = { csvRowCount: 0, skippedEmptyLogin: 0, skippedEmptyEmail: 0 };

  for (const name of names) {
    const filePath = join(mappingDir, name);
    const rows =
      name.toLowerCase() === ADDITIONAL_MAPPING_FILE
        ? parseAdditionalMappingText(await readFile(filePath, 'utf8'))
        : await parseMemberExportCsv(filePath);
    for (const row of rows) addMappingRow(emailSets, row, counters);
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
    csvRowCount: counters.csvRowCount,
    skippedEmptyLogin: counters.skippedEmptyLogin,
    skippedEmptyEmail: counters.skippedEmptyEmail,
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
    const raw = value;
    try {
      value = JSON.parse(value);
    } catch {
      return isIdmUserId(raw) ? [raw] : [];
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
    for (const id of new Set(ids)) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }
  return [...counts.entries()].map(([idmId, rowCount]) => ({ idmId, rowCount }));
}

async function queryGradingByCourseTerm(db: ReturnType<typeof createDb>): Promise<
  { idmId: string; courseId: string; instanceId: string; rowCount: number }[]
> {
  const sql = `SELECT TRIM(userId) AS idmId,
      IFNULL(NULLIF(TRIM(courseId), ''), '(empty)') AS courseId,
      IFNULL(NULLIF(TRIM(instanceId), ''), '(empty)') AS instanceId,
      COUNT(*) AS rowCount
    FROM grading
    WHERE ${IDM_SQL('userId')}
    GROUP BY TRIM(userId),
      IFNULL(NULLIF(TRIM(courseId), ''), '(empty)'),
      IFNULL(NULLIF(TRIM(instanceId), ''), '(empty)')`;
  const rows = await db.query<
    { idmId: string; courseId: string; instanceId: string; rowCount: number | bigint }[]
  >(sql);
  if (!Array.isArray(rows)) {
    throw new TypeError(JSON.stringify(rows));
  }
  return rows.map((r) => ({
    idmId: String(r.idmId),
    courseId: String(r.courseId),
    instanceId: String(r.instanceId),
    rowCount: Number(r.rowCount),
  }));
}

function aggregateGradingByCourseTerm(
  rows: { idmId: string; courseId: string; instanceId: string; rowCount: number }[],
  mapping: Map<string, string>,
  conflictIds: Set<string>
): GradingCourseTermSlice[] {
  const byKey = new Map<
    string,
    GradingCourseTermSlice & {
      mappedIds: Set<string>;
      unmappedIds: Set<string>;
      unmappedCounts: IdCount[];
      allIds: Set<string>;
    }
  >();
  for (const row of rows) {
    const key = `${row.courseId}\t${row.instanceId}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        courseId: row.courseId,
        instanceId: row.instanceId,
        idmRowCount: 0,
        distinctIdmIds: 0,
        mappedRowCount: 0,
        unmappedRowCount: 0,
        unmappedDistinctIds: 0,
        exampleUnmappedIds: [],
        mappedIds: new Set(),
        unmappedIds: new Set(),
        unmappedCounts: [] as IdCount[],
        allIds: new Set(),
      });
    }
    const slice = byKey.get(key)!;
    slice.idmRowCount += row.rowCount;
    slice.allIds.add(row.idmId);
    const usable = mapping.has(row.idmId) && !conflictIds.has(row.idmId);
    if (usable) {
      slice.mappedRowCount += row.rowCount;
      slice.mappedIds.add(row.idmId);
    } else {
      slice.unmappedRowCount += row.rowCount;
      slice.unmappedIds.add(row.idmId);
      slice.unmappedCounts.push({ idmId: row.idmId, rowCount: row.rowCount });
    }
  }
  return [...byKey.values()]
    .map((s) => ({
      courseId: s.courseId,
      instanceId: s.instanceId,
      idmRowCount: s.idmRowCount,
      distinctIdmIds: s.allIds.size,
      mappedRowCount: s.mappedRowCount,
      unmappedRowCount: s.unmappedRowCount,
      unmappedDistinctIds: s.unmappedIds.size,
      exampleUnmappedIds: exampleUnmappedIds(s.unmappedCounts, mapping, conflictIds),
    }))
    .sort(
      (a, b) =>
        b.unmappedRowCount - a.unmappedRowCount ||
        a.courseId.localeCompare(b.courseId) ||
        a.instanceId.localeCompare(b.instanceId)
    );
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
  const key = sourceKey(source);
  return {
    source: key,
    label: displaySourceLabel(key),
    ok: true,
    idmRowCount: counts.reduce((s, c) => s + c.rowCount, 0),
    distinctIdmIds: counts.length,
    mappedRowCount,
    unmappedRowCount,
    unmappedDistinctIds: unmappedIds.size,
    exampleUnmappedIds: exampleUnmappedIds(counts, mapping, conflictIds),
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

function exampleUnmappedIds(counts: IdCount[], mapping: Map<string, string>, conflictIds: Set<string>, limit = 5): string[] {
  return counts
    .filter(({ idmId }) => !(mapping.has(idmId) && !conflictIds.has(idmId)))
    .slice()
    .sort((a, b) => b.rowCount - a.rowCount || a.idmId.localeCompare(b.idmId))
    .slice(0, limit)
    .map(({ idmId }) => idmId);
}

function formatUnmappedLine(
  label: string,
  unmappedEntries: number,
  totalEntries: number,
  unmappedDistinct: number,
  totalDistinct: number,
  examples: string[]
): string {
  let line = `  ${label}: ${unmappedEntries} / ${totalEntries} entries unmapped. ${unmappedDistinct} (${pct(
    unmappedDistinct,
    totalDistinct
  )}) distinct ids left.`;
  if (examples.length) line += ` Eg. ${examples.join(', ')}`;
  return line;
}

function formatMissingIdLine(idmId: string, totalRows: number, bySource: Record<string, number>): string {
  const parts = Object.entries(bySource)
    .filter(([key]) => !OMIT_FROM_MISSING_SOURCES.has(key))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => `${displaySourceLabel(key)}=${count}`);
  const extra = parts.length ? `  ${parts.join(', ')}` : '';
  return `  ${idmId}  rows=${totalRows}${extra}`;
}

function formatCoverageText(params: {
  enough: boolean;
  mappingDir: string;
  mappingLoad: Awaited<ReturnType<typeof loadIdmEmailMapping>>;
  allDbIdsSize: number;
  mappedDistinctInDb: number;
  missingDistinctInDb: number;
  conflictDistinctInDb: number;
  idmRowTotal: number;
  mappedRowTotal: number;
  unmappedRowTotal: number;
  sourceResults: SourceResult[];
  gradingByCourseTerm: GradingCourseTermSlice[];
  missing: ReturnType<typeof mergeMissing>;
}): string {
  const {
    enough,
    mappingDir,
    mappingLoad,
    allDbIdsSize,
    mappedDistinctInDb,
    missingDistinctInDb,
    conflictDistinctInDb,
    idmRowTotal,
    mappedRowTotal,
    unmappedRowTotal,
    sourceResults,
    gradingByCourseTerm,
    missing,
  } = params;
  const lines: string[] = [];
  const p = (line = '') => lines.push(line);
  const failed = sourceResults.filter((r) => !r.ok);
  const withUnmapped = sourceResults
    .filter((r) => r.ok && r.unmappedRowCount > 0)
    .slice()
    .sort((a, b) => b.unmappedRowCount - a.unmappedRowCount);
  const clean = sourceResults.filter((r) => r.ok && r.unmappedRowCount === 0 && r.idmRowCount > 0);

  p('IdM ids');
  p(
    `Total: ${allDbIdsSize}, with mapping: ${mappedDistinctInDb}, missing mapping: ${missingDistinctInDb} (${pct(
      missingDistinctInDb,
      allDbIdsSize
    )})`
  );
  if (conflictDistinctInDb) p(`present but mapping conflict: ${conflictDistinctInDb}`);
  p();
  p('IdM occurrences (sum across tables)');
  p(
    `Total: ${idmRowTotal}, with mapping: ${mappedRowTotal}, missing mapping: ${unmappedRowTotal} (${pct(
      unmappedRowTotal,
      idmRowTotal
    )} of total)`
  );
  p();
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
  p('Per-source aggregate (rows that will not be migrated)');
  for (const r of withUnmapped) {
    p(
      formatUnmappedLine(
        r.label,
        r.unmappedRowCount,
        r.idmRowCount,
        r.unmappedDistinctIds,
        r.distinctIdmIds,
        r.exampleUnmappedIds
      )
    );
  }
  if (!withUnmapped.length) p('  (none)');
  p();
  p('Grading by course / semester');
  for (const slice of gradingByCourseTerm) {
    if (!slice.unmappedRowCount) continue;
    p(
      formatUnmappedLine(
        `${slice.courseId} ${slice.instanceId}`,
        slice.unmappedRowCount,
        slice.idmRowCount,
        slice.unmappedDistinctIds,
        slice.distinctIdmIds,
        slice.exampleUnmappedIds
      )
    );
  }
  const gradingFullyCovered = gradingByCourseTerm.filter((s) => s.idmRowCount > 0 && s.unmappedRowCount === 0);
  if (gradingFullyCovered.length) {
    p('  fully covered:');
    for (const slice of gradingByCourseTerm.filter((s) => s.unmappedRowCount === 0 && s.idmRowCount > 0)) {
      p(`    ${slice.courseId} ${slice.instanceId}: ${slice.idmRowCount} rows, ${slice.distinctIdmIds} ids`);
    }
  }
  if (!gradingByCourseTerm.length) p('  (no grading IdM rows)');
  p();
  p('Sources with IdM rows fully covered by mapping');
  for (const r of clean) p(`  ${r.label}: ${r.idmRowCount} rows, ${r.distinctIdmIds} ids`);
  if (!clean.length) p('  (none)');
  if (failed.length) {
    p();
    p('Sources that failed to query (table/column may not exist)');
    for (const r of failed) p(`  ${r.label}: ${r.error}`);
  }
  p();
  p(`Missing / unusable IdM ids (${missing.length}), sorted by affected row count`);
  const preview = missing.slice(0, 50);
  for (const m of preview) {
    p(formatMissingIdLine(m.idmId, m.totalRows, m.bySource));
  }
  if (missing.length > preview.length) p(`  … ${missing.length - preview.length} more (see JSON report)`);
  return lines.join('\n');
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
  let gradingByCourseTerm: GradingCourseTermSlice[] = [];
  try {
    for (const source of ALL_SOURCES) {
      try {
        const counts =
          source.kind === 'column'
            ? await queryColumnCounts(dbFor(source.db), source)
            : await queryInstructorJsonCounts(dbFor(source.db), source);
        sourceResults.push(toSourceResult(source, counts, mappingLoad.mapping, conflictIds));
      } catch (e) {
        const key = sourceKey(source);
        sourceResults.push({
          source: key,
          label: displaySourceLabel(key),
          ok: false,
          error: e instanceof Error ? e.message : String(e),
          idmRowCount: 0,
          distinctIdmIds: 0,
          mappedRowCount: 0,
          unmappedRowCount: 0,
          unmappedDistinctIds: 0,
          exampleUnmappedIds: [],
          counts: [],
        });
      }
    }
    try {
      const gradingRows = await queryGradingByCourseTerm(gradingDb);
      gradingByCourseTerm = aggregateGradingByCourseTerm(gradingRows, mappingLoad.mapping, conflictIds);
    } catch (e) {
      console.error('Failed to break down grading by course/semester:', e);
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
    gradingByCourseTerm,
    missingIdmIds: missing,
  };

  const text = formatCoverageText({
    enough,
    mappingDir,
    mappingLoad,
    allDbIdsSize: allDbIds.size,
    mappedDistinctInDb,
    missingDistinctInDb,
    conflictDistinctInDb,
    idmRowTotal,
    mappedRowTotal,
    unmappedRowTotal,
    sourceResults,
    gradingByCourseTerm,
    missing,
  });
  console.log(text);

  const jsonPath = join(mappingDir, 'idm-mapping-coverage-report.json');
  const txtPath = join(mappingDir, 'idm-mapping-coverage-report.txt');
  await writeFile(jsonPath, JSON.stringify(report, null, 2));
  await writeFile(txtPath, text + '\n');
  console.log(`\nWrote ${txtPath}`);
  console.log(`Wrote ${jsonPath}`);
}
