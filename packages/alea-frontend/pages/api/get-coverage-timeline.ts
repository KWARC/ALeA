import { CoverageTimeline, CURRENT_TERM } from '@alea/utils';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';

const getCurrentSemesterFile = (baseDir: string) => {
  const filePath = path.join(baseDir, 'current-sem.json');
  return fs.existsSync(filePath) ? [filePath] : [];
};

const getPreviousSemesterFile = (prevSemsDir: string, instanceId: string) => {
  const filePath = path.join(prevSemsDir, `${instanceId}-final.json`);
  return fs.existsSync(filePath) ? [filePath] : [];
};

const getAllPreviousSemesterFiles = (prevSemsDir: string) => {
  if (!fs.existsSync(prevSemsDir)) return [];
  return fs
    .readdirSync(prevSemsDir)
    .map((f) => path.join(prevSemsDir, f))
    .filter((f) => fs.lstatSync(f).isFile());
};

export const CURRENT_SEM_FILE = 'current-sem.json';
export function getCoverageData(instanceId?: string): CoverageTimeline {
  const baseDir = process.env.RECORDED_SYLLABUS_DIR;
  const prevSemsDir = path.join(baseDir, 'prev-sem');

  let filePaths: string[] = [];
  const isCurrentTerm = instanceId === CURRENT_TERM;
  if (isCurrentTerm) {
    filePaths = getCurrentSemesterFile(baseDir);
  } else if (instanceId) {
    filePaths = getPreviousSemesterFile(prevSemsDir, instanceId);
  } else {
    filePaths = [...getAllPreviousSemesterFiles(prevSemsDir), ...getCurrentSemesterFile(baseDir)];
  }
  const combinedData: CoverageTimeline = {};
  for (const filePath of filePaths) {
    try {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const parsed: CoverageTimeline = JSON.parse(fileData);
      for (const [courseId, entries] of Object.entries(parsed)) {
        combinedData[courseId] = entries;
      }
    } catch (err) {
      console.warn(`Skipping invalid file ${filePath}:`, err);
    }
  }

  return combinedData;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json(getCoverageData());
}
