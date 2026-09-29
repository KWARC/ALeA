import fs from 'node:fs';
import path from 'node:path';

export const PRINT_PACK_COMBINED_FILE = 'combined.pdf';
export const PRINT_PACK_ROSTER_FILE = 'roster.pdf';
export const PRINT_PACK_MANIFEST_FILE = 'manifest.json';
export const PRINT_PACK_STUDENTS_DIR = 'students';

export interface CheatsheetPrintPackStudent {
  userId: string;
  studentName: string;
  weekIds: string[];
  fileName: string;
  matriculationNumber?: string;
}

export function compareCheatsheetPrintPackStudents(
  a: CheatsheetPrintPackStudent,
  b: CheatsheetPrintPackStudent
) {
  const matA = a.matriculationNumber?.trim();
  const matB = b.matriculationNumber?.trim();
  if (matA && matB) {
    const matCmp = matA.localeCompare(matB, undefined, { numeric: true, sensitivity: 'base' });
    if (matCmp !== 0) return matCmp;
  } else if (matA) {
    return -1;
  } else if (matB) {
    return 1;
  }
  const nameCmp = a.studentName.localeCompare(b.studentName, undefined, { sensitivity: 'base' });
  if (nameCmp !== 0) return nameCmp;
  return a.userId.localeCompare(b.userId);
}

export interface CheatsheetPrintPackManifest {
  generatedAt: string;
  universityId: string;
  courseId: string;
  instanceId: string;
  courseName: string;
  registeredWithUploadsCount: number;
  registeredNoUploadsCount: number;
  unregisteredWithUploadsCount: number;
  enrolledUnregisteredNoUploadsCount: number;
  combinedCount: number;
  mergedCount: number;
  skipped: { userId: string; reason: string }[];
  students: CheatsheetPrintPackStudent[];
}

function sanitizeSegment(value: string) {
  return value.replace(/[/\\]/g, '_');
}

export function getPrintPackDir(
  cheatsheetsDir: string,
  universityId: string,
  courseId: string,
  instanceId: string
) {
  return path.resolve(
    cheatsheetsDir,
    'print-packs',
    sanitizeSegment(universityId),
    sanitizeSegment(courseId),
    sanitizeSegment(instanceId)
  );
}

export function safeStudentPdfName(userId: string) {
  return `${userId.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;
}

export function isPathInside(baseDir: string, filePath: string) {
  const base = path.resolve(baseDir);
  const resolved = path.resolve(filePath);
  return resolved === base || resolved.startsWith(base + path.sep);
}

export function resolveSafeCheatsheetPath(baseDir: string, fileName: string): string | null {
  const filePath = path.isAbsolute(fileName) ? fileName : path.resolve(baseDir, fileName);
  if (!isPathInside(baseDir, filePath)) return null;
  return filePath;
}

export function ensurePrintPackDir(packDir: string) {
  fs.mkdirSync(path.join(packDir, PRINT_PACK_STUDENTS_DIR), { recursive: true });
}

export function resetPrintPackDir(packDir: string) {
  fs.rmSync(packDir, { recursive: true, force: true });
  ensurePrintPackDir(packDir);
}

export function readPrintPackManifest(packDir: string): CheatsheetPrintPackManifest | null {
  const manifestPath = path.join(packDir, PRINT_PACK_MANIFEST_FILE);
  if (!fs.existsSync(manifestPath)) return null;
  const raw = fs.readFileSync(manifestPath, 'utf-8');
  return JSON.parse(raw) as CheatsheetPrintPackManifest;
}
