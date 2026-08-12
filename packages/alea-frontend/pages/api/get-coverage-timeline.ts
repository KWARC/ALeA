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
    //We will do something else to handle upcoming semesters, but for now, if the file doesn't exist, we will fall back to the current semester file.
    if (filePaths.length === 0) filePaths = getCurrentSemesterFile(baseDir);
  } else {
    filePaths = [...getAllPreviousSemesterFiles(prevSemsDir), ...getCurrentSemesterFile(baseDir)];
  }
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
