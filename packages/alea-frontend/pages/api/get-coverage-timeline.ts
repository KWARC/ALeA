import { CoverageTimeline } from '@alea/utils';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';

export const CURRENT_SEM_FILE = 'current-sem.json';
export function getCoverageData(): CoverageTimeline {
  const baseDir = process.env.RECORDED_SYLLABUS_DIR;
  const prevSemsDir = baseDir + '/prev-sem';
  const currentSemPath = baseDir + '/' + CURRENT_SEM_FILE;
  const filePaths: string[] = [];

  if (fs.existsSync(prevSemsDir)) {
    const prevFiles = fs.readdirSync(prevSemsDir);
    for (const file of prevFiles) {
     const fullPath = prevSemsDir + '/' + file;
     if (fs.lstatSync(fullPath).isFile()) {
       filePaths.push(fullPath);
     }
    }
  }
  if (fs.existsSync(currentSemPath)) {
    filePaths.push(currentSemPath);
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
