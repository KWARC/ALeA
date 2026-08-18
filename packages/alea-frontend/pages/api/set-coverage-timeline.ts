import { Action, LectureEntry, CoverageTimeline, ResourceName } from '@alea/utils';
import fs from 'fs';
import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdIfAuthorizedOrSetError } from './access-control/resource-utils';
import { checkIfPostOrSetError } from './comment-utils';
import {
  ensureInstanceSyllabusDir,
  getInstanceSyllabusFilePath,
  getRecordedSyllabusDir,
} from './get-coverage-timeline';

function backupFileName(instanceId: string) {
  return path.join(
    getRecordedSyllabusDir(),
    'backups',
    `${instanceId}_${instanceId}.json_bkp_${Date.now()}.json`
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;

  const courseId = req.body.courseId as string;
  const instanceId = req.body.instanceId as string;
  const action = req.body.action || 'upsert';
  if (!courseId || !instanceId) {
    return res.status(400).json({ message: 'Missing courseId or instanceId.' });
  }
  if (action !== 'upsert' && action !== 'delete') {
    return res
      .status(400)
      .json({ message: 'Invalid action. Must be either "upsert" or "delete".' });
  }

  try {
    const userId = await getUserIdIfAuthorizedOrSetError(
      req,
      res,
      ResourceName.COURSE_SYLLABUS,
      Action.MUTATE,
      {
        courseId,
        instanceId,
      }
    );
    if (!userId) return;

    ensureInstanceSyllabusDir(instanceId);
    const filePath = getInstanceSyllabusFilePath(instanceId);

    // Read the current file contents
    let existingData: CoverageTimeline = {};
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      existingData = JSON.parse(fileData);
    }
    const backupDir = path.join(getRecordedSyllabusDir(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Backup before changing anything
    fs.writeFileSync(backupFileName(instanceId), JSON.stringify(existingData, null, 2));

    const courseData = existingData[courseId] ?? {
      lectures: [],
      notCoveredSections: [],
    };

    const currentSnaps = courseData.lectures;

    // Replace the row with the same timestamp or add it if new
    let newSnaps: LectureEntry[] = currentSnaps;

    if (action === 'upsert' && req.body.updatedEntry) {
      const updatedEntry = req.body.updatedEntry as LectureEntry;

      newSnaps = [
        ...currentSnaps.filter((entry) => entry.timestamp_ms !== updatedEntry.timestamp_ms),
        updatedEntry,
      ].sort((a, b) => a.timestamp_ms - b.timestamp_ms);
    } else if (action === 'delete' && req.body.timestamp_ms) {
      const timestamp = req.body.timestamp_ms;
      newSnaps = currentSnaps.filter((entry) => entry.timestamp_ms !== timestamp);
    }

    const sanitizedLectures = newSnaps.filter(Boolean);

    existingData[courseId] = {
      lectures: sanitizedLectures,
      notCoveredSections: req.body.notCoveredSections ?? courseData.notCoveredSections,
    };

    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
    return res.status(200).end();
  } catch (error) {
    console.error('Error updating row:', error);
    res.status(500).json({ message: 'Error updating row' });
  }
}
