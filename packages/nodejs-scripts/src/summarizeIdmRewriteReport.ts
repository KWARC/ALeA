import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

type ColumnUpdate = { table: string; column: string; rows: number };

type RewriteRow = {
  oldId: string;
  email: string;
  skipped?: string;
  skipDetail?: string;
  createdUserInfo: boolean;
  alreadyCanonical: boolean;
  columnUpdates: ColumnUpdate[];
  gradingRows: number;
  instructorJsonRows: number;
  commentsUserEmailRows: number;
};

type Report = {
  generatedAt: string;
  apply: boolean;
  mappingCount: number;
  conflicts: { idmId: string; emails: string[] }[];
  rewritable: number;
  wouldTouch: number;
  skipped: RewriteRow[];
  results: RewriteRow[];
};

function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1).toLowerCase() : '(none)';
}

function bump(map: Map<string, number>, key: string, n = 1) {
  map.set(key, (map.get(key) ?? 0) + n);
}

function top(map: Map<string, number>, limit: number) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function rowTouches(r: RewriteRow): boolean {
  return (
    r.gradingRows > 0 ||
    r.instructorJsonRows > 0 ||
    r.commentsUserEmailRows > 0 ||
    r.columnUpdates.some((c) => c.rows > 0)
  );
}

function personRows(r: RewriteRow): number {
  return r.columnUpdates.reduce((s, c) => s + c.rows, 0);
}

export async function summarizeIdmRewriteReport() {
  const reportPath =
    process.env.IDM_REWRITE_REPORT ||
    join(process.env.IDM_MAPPING_DIR || join(process.cwd(), 'student_data'), 'idm-userid-rewrite-report.json');
  const report = JSON.parse(await readFile(reportPath, 'utf8')) as Report;
  const results = report.results ?? [];
  const skipped = report.skipped ?? [];

  const skipReasons = new Map<string, number>();
  for (const s of skipped) bump(skipReasons, s.skipped ?? 'unknown');

  const created = results.filter((r) => r.createdUserInfo).length;
  const already = results.filter((r) => r.alreadyCanonical).length;
  const withData = results.filter(rowTouches).length;
  const userInfoOnly = results.filter((r) => !rowTouches(r)).length;

  const byColumn = new Map<string, { users: number; rows: number }>();
  let commentsPersonRows = 0;
  let gradingRows = 0;
  let instructorJsonRows = 0;
  let commentsUserEmailRows = 0;
  const domainRewrite = new Map<string, number>();
  const domainSkip = new Map<string, number>();
  const heaviest = [...results]
    .map((r) => ({
      oldId: r.oldId,
      email: r.email,
      createdUserInfo: r.createdUserInfo,
      rows: personRows(r) + r.gradingRows + r.instructorJsonRows + r.commentsUserEmailRows,
    }))
    .sort((a, b) => b.rows - a.rows);

  for (const r of results) {
    bump(domainRewrite, emailDomain(r.email));
    gradingRows += r.gradingRows;
    instructorJsonRows += r.instructorJsonRows;
    commentsUserEmailRows += r.commentsUserEmailRows;
    for (const c of r.columnUpdates) {
      commentsPersonRows += c.rows;
      if (c.rows <= 0) continue;
      const key = `${c.table}.${c.column}`;
      const cur = byColumn.get(key) ?? { users: 0, rows: 0 };
      cur.users += 1;
      cur.rows += c.rows;
      byColumn.set(key, cur);
    }
  }
  for (const s of skipped) bump(domainSkip, emailDomain(s.email));

  const lines: string[] = [];
  const p = (s: string) => lines.push(s);
  p(`Report: ${reportPath}`);
  p(`Generated: ${report.generatedAt}  apply=${report.apply}`);
  p('');
  p(`Verified idmId↔email pairs from userInfo: ${report.mappingCount}`);
  p(`Duplicate verified emails skipped as a set: ${report.conflicts?.length ?? (report as { duplicateEmails?: unknown[] }).duplicateEmails?.length ?? 0}`);
  p(`Rewritable: ${report.rewritable}`);
  p(`Would touch (listed in results): ${report.wouldTouch} / results.length=${results.length}`);
  p(`Skipped: ${skipped.length}`);
  for (const [reason, n] of top(skipReasons, 20)) p(`  ${reason}: ${n}`);
  for (const s of skipped) {
    p(`  ${s.oldId} → ${s.email} (${s.skipped}) holder/detail=${s.skipDetail ?? ''}`);
  }
  p('');
  p('Among rewritable:');
  p(`  INSERT new userInfo: ${created} (Phase 6 must be 0)`);
  p(`  Already canonical (userId=email and idmId=Login): ${already}`);
  p(`  Rewrite userInfo PK only (no child/grading/instructor hits): ${userInfoOnly}`);
  p(`  At least one child/grading/instructor/userEmail row: ${withData}`);
  p('');
  p('Row totals that would be rewritten:');
  p(`  comments person columns: ${commentsPersonRows}`);
  p(`  comments.userEmail: ${commentsUserEmailRows}`);
  p(`  courseMetadata instructors JSON courses: ${instructorJsonRows} (Phase 6 must be 0)`);
  p(`  grading.userId: ${gradingRows}`);
  p('');
  p('Person columns with hits (users, rows):');
  for (const [key, v] of [...byColumn.entries()].sort((a, b) => b[1].rows - a[1].rows)) {
    p(`  ${key}: ${v.users} users, ${v.rows} rows`);
  }
  p('');
  p('Rewrite email domains:');
  for (const [d, n] of top(domainRewrite, 15)) p(`  ${d}: ${n}`);
  p('Skipped email domains:');
  for (const [d, n] of top(domainSkip, 15)) p(`  ${d}: ${n}`);
  p('');
  p('Heaviest 15 people (sum of matching rows):');
  for (const h of heaviest.slice(0, 15)) {
    p(`  ${h.oldId} ${h.email} rows=${h.rows} newUserInfo=${h.createdUserInfo}`);
  }

  const text = lines.join('\n');
  console.log(text);
  return text;
}
