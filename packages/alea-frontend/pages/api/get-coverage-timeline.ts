import { CoverageTimeline } from '@alea/utils';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';

export function getRecordedSyllabusDir() {
  const baseDir = process.env.RECORDED_SYLLABUS_DIR;
  if (!baseDir) throw new Error('RECORDED_SYLLABUS_DIR is not set');
  return baseDir;
}

export function getInstanceSyllabusFilePath(instanceId: string) {
  return path.join(getRecordedSyllabusDir(), instanceId, `${instanceId}.json`);
}

export function ensureInstanceSyllabusDir(instanceId: string) {
  fs.mkdirSync(path.dirname(getInstanceSyllabusFilePath(instanceId)), { recursive: true });
}

function getAllInstanceSyllabusFiles(baseDir: string) {
  if (!fs.existsSync(baseDir)) return [];
  return fs
    .readdirSync(baseDir)
    .map((entry) => path.join(baseDir, entry, `${entry}.json`))
    .filter((filePath) => fs.existsSync(filePath) && fs.lstatSync(filePath).isFile());
}

export function getCoverageData(instanceId?: string): CoverageTimeline {
  const baseDir = getRecordedSyllabusDir();
  const filePaths = instanceId
    ? [getInstanceSyllabusFilePath(instanceId)].filter((filePath) => fs.existsSync(filePath))
    : getAllInstanceSyllabusFiles(baseDir);
  const combinedData: CoverageTimeline = {};
  for (const filePath of filePaths) {
    try {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const parsed: CoverageTimeline = JSON.parse(fileData);
      for (const [courseId, entries] of Object.entries(parsed)) {
        combinedData[courseId] = Array.isArray(entries) ? { lectures: entries } : entries;
      }
    } catch (err) {
      console.warn(`Skipping invalid file ${filePath}:`, err);
    }
  }

  return combinedData;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const instanceId = req.query.instanceId as string | undefined;
  res.status(200).json(getCoverageData(instanceId));
}
